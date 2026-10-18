/**
 * Exercises the inbound agent's logic end to end with canned answers (no phone):
 * caller-ID routing -> pharmacy intake (Jev triage + matcher) -> coordinator answers
 * (Jev judging + code checks) -> staff approval -> audit trail.
 *   npm run demo:agent
 * Uses an in-memory database unless COLDLINE_DB_PATH is set. Calls Jev and Google Routes for real.
 */

process.env.COLDLINE_DB_PATH ??= ":memory:";

import { jevJudge } from "../src/application/typesafe/jev.ts";
import { listAudit, listFacilityResponses } from "../src/database/queries/index.ts";
import { getFacilities, getFacility } from "../src/database/seed/index.ts";
import { approvalScript, describeOption, findIncidentForApproval, recordStaffDecision } from "../src/services/approval.ts";
import { assessResponse, findRequestForFacility, requestScript, submitCoordinatorAnswer, type CoordinatorAnswer } from "../src/services/coordinator.ts";
import { intakeClosingLine, submitIntake } from "../src/services/intake.ts";
import { parseRoleOverride, resolveCaller } from "../src/services/routing.ts";

const section = (t: string) => console.log(`\n=== ${t} ===`);
const assert = (cond: unknown, msg: string) => {
  if (!cond) { console.error(`ASSERTION FAILED: ${msg}`); process.exit(1); }
};

// 1. Routing. Demo numbers are mostly unset, so give this process synthetic ones.
section("Caller-ID routing");
const fake: Record<string, string> = {
  PHARMACY_PHONE: "+15550000001", STAFF_PHONE: "+15550000002",
  FACILITY_A_PHONE: "+15550000011", FACILITY_B_PHONE: "+15550000012", FACILITY_C_PHONE: "+15550000013",
};
for (const [k, v] of Object.entries(fake)) process.env[k] = v;
for (const [label, number] of [...Object.entries(fake), ["unknown", "+15559999999"], ["no caller id", null]] as const) {
  console.log(`  ${label.padEnd(17)} ${String(number).padEnd(13)} -> ${JSON.stringify(resolveCaller(number))}`);
}
assert(resolveCaller("(555) 000-0012").role === "coordinator", "formatted number should match");
assert(resolveCaller("+15559999999").role === "unknown", "unknown number must be refused");
for (const o of ["pharmacy", "staff", "facility:b", "facility:glendale-depot", "bogus"]) {
  console.log(`  --as ${o.padEnd(24)} -> ${JSON.stringify(parseRoleOverride(o))}`);
}

// 2. Pharmacy intake.
section("Pharmacy intake (Jev triage + matcher)");
const intake = await submitIntake({
  pharmacyId: "eastside-rx",
  product: "Influenza vaccine (synthetic)",
  units: 180,
  reportedStorage: "refrigerated",
  currentTemp: "9.4 C and climbing",
  minutesSinceFailure: 25,
}, jevJudge);
const inc = intake.incident;
console.log(`  incident ${inc.id}: ${inc.totalUnits} ${inc.storageType}, ${inc.currentTempC}°C, urgency ${inc.urgency}, excursion ${inc.excursionOccurred}`);
console.log(`  Jev: storage ${intake.triage.storageType} (${intake.triage.storageConfidence.toFixed(2)}), ` +
  `urgency score ${intake.triage.urgencyScore.toFixed(2)}, excursion p=${intake.triage.excursion.toFixed(2)}`);
for (const c of intake.match.candidates) console.log(`  candidate ${c.facility.name}: ${c.driveMinutes} min`);
for (const e of intake.match.excluded) console.log(`  excluded ${e.facility?.name ?? e.facilityId}: ${e.reason}`);
console.log(`  agent closing: ${intakeClosingLine(intake)}`);
assert(listFacilityResponses(inc.id).every((r) => r.status === "unknown"), "responses start unknown");

// 3. Coordinators call in. Fixed clock: 2:00 pm Pacific.
section("Coordinator answers (Jev judging + code checks)");
const at2pm = new Date("2026-10-17T21:00:00Z");
const canned: Record<string, CoordinatorAnswer> = {
  "arts-district-clinic": {
    reportedCapacity: 300, receivingCutoff: "6 pm", conditions: "",
    transcript: "Yes, we have room for 300 refrigerated units and we receive until 6 pm. Send them over.",
  },
  "westlake-health": {
    reportedCapacity: 200, receivingCutoff: "10 pm", conditions: "only if a pharmacist signs the chain-of-custody form on arrival",
    transcript: "We can take 200, but only if your pharmacist signs our chain-of-custody form at drop-off. We're open till 10.",
  },
  "glendale-depot": {
    reportedCapacity: 500, receivingCutoff: "24 hours", conditions: "",
    transcript: "Yeah we have plenty of room, 500 units. Actually no, the fridge is being serviced, I'm not sure we can take anything today.",
  },
};
for (const f of getFacilities()) {
  const brief = await findRequestForFacility(f.id);
  if (!brief) { console.log(`  ${f.name}: no open request (as the agent would say)`); continue; }
  console.log(`  read-out: ${requestScript(brief)}`);
  const r = await submitCoordinatorAnswer(brief, canned[f.id], jevJudge, at2pm);
  console.log(`  ${f.name}: ${r.assessment.status.toUpperCase()} — Jev ${r.judgment.answerStatus} ` +
    `(${r.judgment.answerConfidence.toFixed(2)}), capacity p=${r.judgment.hasCapacity.toFixed(2)}, ` +
    `condition p=${r.judgment.hasCondition.toFixed(2)}; ${r.assessment.reasons.join("; ")}`);
}

// Low confidence never becomes a guess (pure rule, no API call).
const low = assessResponse(canned["arts-district-clinic"], {
  answerStatus: "definite", answerConfidence: 0.41, hasCapacity: 0.9, hasCondition: 0.1, labels: {},
}, 180, 10, 14 * 60);
console.log(`  low-confidence check: ${low.status} (${low.reasons[0]})`);
assert(low.status === "incomplete", "low Jev confidence must be incomplete");
const late = assessResponse(canned["arts-district-clinic"], {
  answerStatus: "definite", answerConfidence: 0.95, hasCapacity: 0.95, hasCondition: 0.05, labels: {},
}, 180, 30, 17 * 60 + 45);
console.log(`  cutoff check (5:45 pm + 30 min drive vs 6 pm): ${late.status} (${late.reasons[0]})`);
assert(late.status === "unavailable", "arrival after cutoff must be unavailable");

// 4. Staff approval.
section("Staff approval");
const found = findIncidentForApproval();
assert(found && found.incident.id === inc.id, "incident should be up for approval");
const { options } = found!;
console.log(`  script: ${approvalScript(found!.incident, options)}`);
for (const o of options) {
  const text = describeOption(o);
  assert(o.status === "confirmed" ? text.includes("CONFIRMED") : text.includes("CONDITIONAL, not confirmed"),
    "conditional sites must never read as confirmed");
}
assert(options.every((o) => o.status === "confirmed" || o.status === "conditional"), "only confirmed/conditional are offered");
const outcome = recordStaffDecision({
  incident: found!.incident, options, choice: "approve", decidedBy: "Demo Pharmacist (staff, demo)",
});
console.log(`  decision: ${outcome.message} by ${outcome.decision?.decidedBy} at ${outcome.decision?.decidedAt}`);
assert(outcome.decision?.decision === "approved", "decision recorded");

// 5. Audit trail.
section("Final facility statuses");
for (const r of listFacilityResponses(inc.id)) console.log(`  ${getFacility(r.facilityId)?.name.padEnd(36)} ${r.status}`);
section("Audit log");
for (const row of listAudit()) console.log(`  #${row.id} ${row.eventType}`);
console.log("\nDemo complete.");

/**
 * Simulated responders, no phones: a pharmacy persona calls in and opens an incident, then the three
 * coordinator personas (staff1-3, Claude-driven) call the real inbound agent at the same time via
 * Guava agent.test(). Jev judging and DB/audit writes happen exactly as on a real call.
 *
 *   npm run simulate                  pharmacy call + staff1-3 in parallel
 *   npm run simulate -- --redteam     also run the red-team caller on its own incident
 *   npm run simulate -- --direct      open the incident straight through intake (skip the pharmacy call)
 *   npm run simulate -- --real-clock  judge cutoffs at the real time (default: 2:00 pm Pacific)
 *
 * Writes to backend/data/coldline.db unless COLDLINE_DB_PATH is set.
 */

import { listAudit } from "../src/database/queries/index.ts";
import { getFacility } from "../src/database/seed/index.ts";
import { describeOption } from "../src/services/approval.ts";
import { localMinutes } from "../src/services/coordinator.ts";
import { clockNow, setClock } from "../src/utils/clock.ts";
import {
  openSimulatedIncident, runRedTeam, simulateResponders, type Persona, type ResponderResult,
} from "../agents/simulator.ts";

const args = process.argv.slice(2);
const section = (t: string) => console.log(`\n=== ${t} ===`);
const indent = (s: string) => s.split("\n").map((l) => `    ${l}`).join("\n");
const failures: string[] = [];

if (!args.includes("--real-clock")) {
  const now = new Date();
  setClock(new Date(now.getTime() + (14 * 60 - localMinutes(now)) * 60_000));
  console.log(`Business clock set to ${clockNow().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles" })} Pacific (use --real-clock to disable).`);
}

const live = (p: Persona, line: string) => console.log(`  ${p.key.padEnd(8)} ${line}`);

function printResult(r: ResponderResult) {
  const resp = r.response;
  const facility = r.persona.facilityId ? getFacility(r.persona.facilityId)?.name : r.persona.name;
  console.log(`\n--- ${r.persona.key}: ${facility} (${r.turns} caller turns, ended by ${r.endedBy}) ---`);
  console.log(indent(r.transcript || "(no conversation)"));
  if (!resp) return;
  const labels = Object.entries(resp.jevLabels ?? {}).map(([k, v]) => `${k}=${Number(v).toFixed(2)}`).join(" ");
  console.log(`  status:      ${resp.status.toUpperCase()}`);
  console.log(`  Jev:         ${labels || "(none)"}`);
  console.log(`  capacity:    ${resp.reportedCapacity ?? "-"}   receiving until: ${resp.receivingUntil ?? "-"}`);
  console.log(`  conditions:  ${resp.conditions || "-"}`);
}

// 1. Incident.
section("Pharmacy reports a failure");
const { incident, run: pharmacyRun } = await openSimulatedIncident({
  viaCall: !args.includes("--direct"),
  log: (line) => console.log(`  pharmacy ${line}`),
});
console.log(`  incident ${incident.id}: ${incident.totalUnits} ${incident.storageType} units, urgency ${incident.urgency}` +
  `${pharmacyRun ? "" : " (direct intake)"}`);

// 2. Coordinators, in parallel.
section("Coordinators call in (staff1-3 in parallel)");
const { results, options } = await simulateResponders({ incidentId: incident.id, log: live });
section("Transcripts and Jev judgments");
for (const r of results) {
  printResult(r);
  failures.push(...r.problems.map((p) => `${r.persona.key}: ${p}`));
}

section("Final facility statuses");
for (const r of results) {
  console.log(`  ${r.persona.key.padEnd(8)} ${(getFacility(r.persona.facilityId!)?.name ?? "").padEnd(36)} ` +
    `${(r.response?.status ?? "none").padEnd(13)} ${r.problems.length ? `✗ ${r.problems.join("; ")}` : "✓"}`);
}

section("Recommended option (awaiting staff approval)");
if (options.length) {
  for (const o of options) console.log(`  ${o.rank === 1 ? "→" : " "} ${describeOption(o)}`);
} else {
  console.log("  none: no confirmed or conditional site yet");
}
console.log(`  audit rows for this incident: ${listAudit(incident.id).length}`);

// 3. Red team.
if (args.includes("--redteam")) {
  section("Red team (own incident, glendale line)");
  const rt = await runRedTeam((line) => console.log(`  redteam  ${line}`));
  printResult(rt);
  console.log(`  decisions recorded: ${rt.decisions}   incident status: ${rt.incident.status} (closed after the test)`);
  console.log(`  transcript evaluation: ${rt.evaluation.passed ? "passed" : "FAILED"}: ${rt.evaluation.detail}`);
  console.log(`  verdict: ${rt.problems.length ? `✗ ${rt.problems.join("; ")}` : "✓ never confirmed, no decision without staff"}`);
  failures.push(...rt.problems.map((p) => `redteam: ${p}`));
}

console.log(failures.length ? `\nSimulation finished with ${failures.length} problem(s):\n  ${failures.join("\n  ")}` : "\nSimulation finished: all outcomes as expected.");
process.exit(failures.length ? 1 : 0);

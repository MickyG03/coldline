/**
 * Coldline inbound voice agent (+12403691080).
 *
 * Caller ID decides the role: pharmacy (report a failure), coordinator (answer a storage
 * request for their facility), or staff (approve the transfer). Unknown numbers are refused.
 * This file is thin Guava glue; the business logic lives in src/services.
 *
 * Chat/test mode has no caller ID, so the `role_override` call variable stands in:
 *   npm run chat -- --as pharmacy | facility:<id or a|b|c> | staff
 */

import * as guava from "@guava-ai/guava-sdk";
import { jevJudge } from "../../src/application/typesafe/jev.ts";
import { getFacility, getPharmacy } from "../../src/database/seed/index.ts";
import {
  approvalScript, findIncidentForApproval, recordStaffDecision, type ApprovalOption, type StaffChoice,
} from "../../src/services/approval.ts";
import {
  coordinatorClosingLine, findRequestForFacility, requestScript, submitCoordinatorAnswer, type RequestBrief,
} from "../../src/services/coordinator.ts";
import { intakeClosingLine, submitIntake } from "../../src/services/intake.ts";
import { parseRoleOverride, resolveCaller, type CallerRole } from "../../src/services/routing.ts";
import { bus } from "../../src/utils/events.ts";
import type { Incident } from "../../src/database/models/index.ts";

const logger = guava.getDefaultLogger();

const agent = new guava.Agent({
  name: "Coldline",
  organization: "Coldline vaccine cold-chain response",
  purpose: "Coordinate emergency backup cold storage for pharmacy vaccine inventory.",
});

// Per-call context the task-complete handlers need.
interface CallState {
  role: CallerRole;
  fromNumber: string | null;
  brief?: RequestBrief;
  approval?: { incident: Incident; options: ApprovalOption[] };
}
const calls = new Map<string, CallState>();

const str = async (call: guava.Call, key: string) => {
  const v = await call.getField(key);
  return v == null ? "" : String(v).trim();
};
const int = async (call: guava.Call, key: string) => {
  const n = parseInt(await str(call, key));
  return Number.isFinite(n) ? n : null;
};

async function identify(call: guava.Call): Promise<{ role: CallerRole; fromNumber: string | null; via: "caller_id" | "override" }> {
  const info = call.callInfo;
  const fromNumber = info.call_type === "pstn" ? info.from_number : null;
  if (fromNumber) return { role: resolveCaller(fromNumber), fromNumber, via: "caller_id" };
  // No caller ID (chat / test / webrtc): allow the explicit override variable.
  return { role: parseRoleOverride(await call.getVariable("role_override").catch(() => null)), fromNumber, via: "override" };
}

agent.onCallStart(async (call) => {
  const { role, fromNumber, via } = await identify(call);
  calls.set(call.id, { role, fromNumber });

  if (role.role === "unknown") {
    logger.warn("Refusing call %s from %s", call.id, fromNumber ?? "(no caller ID)");
    bus.publish("caller.refused", { incidentId: null, callId: call.id, fromNumber, reason: "number not on the Coldline roster" });
    await call.hangup(
      "Politely explain this line only serves registered pharmacies, backup storage facilities and " +
        "Coldline staff, and that this number is not registered. Apologize and say goodbye.",
    );
    return;
  }
  bus.publish("caller.routed", {
    incidentId: null, callId: call.id, role: role.role, facilityId: role.role === "coordinator" ? role.facilityId : undefined, via,
  });

  if (role.role === "pharmacy") return startIntake(call, role.pharmacyId);
  if (role.role === "coordinator") return startCoordinator(call, role.facilityId);
  return startApproval(call);
});

// --- pharmacy intake ---

async function startIntake(call: guava.Call, pharmacyId: string) {
  const pharmacy = getPharmacy(pharmacyId)!;
  await call.setTask({
    taskId: "pharmacy_intake",
    objective:
      `Take a cold-storage failure report from ${pharmacy.name}. Collect inventory facts only — ` +
      "never ask for or record any patient information. Be calm and quick.",
    checklist: [
      guava.Say("This is Coldline, the vaccine cold-chain response line."),
      guava.Field({
        key: "pharmacy_confirmed",
        fieldType: "multiple_choice",
        choices: ["yes", "no"],
        question: `I have this number registered to ${pharmacy.name}. Is that who's calling?`,
      }),
      guava.Field({ key: "product", fieldType: "text", description: "Name of the vaccine or product at risk" }),
      guava.Field({ key: "units", fieldType: "integer", description: "Number of units (doses) at risk" }),
      guava.Field({
        key: "storage_type",
        fieldType: "multiple_choice",
        choices: ["refrigerated", "frozen", "ultra-cold", "not sure"],
        description: "Storage class the product is labeled for",
      }),
      guava.Field({
        key: "current_temp",
        fieldType: "text",
        description: "Current temperature reading inside the failed unit, with units (C or F) if given",
      }),
      guava.Field({ key: "minutes_since_failure", fieldType: "integer", description: "Roughly how many minutes since the unit failed or the alarm went off" }),
    ],
  });
}

agent.onTaskComplete("pharmacy_intake", async (call) => {
  const state = calls.get(call.id);
  if (state?.role.role !== "pharmacy") return call.hangup();
  if ((await str(call, "pharmacy_confirmed")).toLowerCase() !== "yes") {
    return call.hangup("Explain that this number is registered to a different pharmacy, so please call from the registered pharmacy line. Say goodbye.");
  }
  try {
    const result = await submitIntake({
      pharmacyId: state.role.pharmacyId,
      product: await str(call, "product"),
      units: (await int(call, "units")) ?? 0,
      reportedStorage: await str(call, "storage_type"),
      currentTemp: await str(call, "current_temp"),
      minutesSinceFailure: await int(call, "minutes_since_failure"),
    }, jevJudge);
    logger.info("Incident %s opened, %d candidates", result.incident.id, result.match.candidates.length);
    await call.hangup(intakeClosingLine(result));
  } catch (err) {
    logger.error("Intake failed: %s", err);
    await call.hangup("Apologize: the report could not be saved due to a system error. Ask them to call back or contact staff directly. Say goodbye.");
  }
});

// --- facility coordinator ---

async function startCoordinator(call: guava.Call, facilityId: string) {
  const facility = getFacility(facilityId)!;
  const brief = await findRequestForFacility(facilityId);
  if (!brief) {
    await call.hangup(`Greet the ${facility.name} coordinator, thank them for calling Coldline, and explain there is no open storage request for their site right now. Say goodbye.`);
    return;
  }
  calls.get(call.id)!.brief = brief;
  await call.setTask({
    taskId: "coordinator_response",
    objective:
      `You are calling on behalf of Coldline. Read the storage request to the ${facility.name} coordinator and ` +
      "record exactly what they say. Do not pressure them or assume a yes.",
    checklist: [
      guava.Say(`Thanks for calling Coldline. ${requestScript(brief)}`),
      guava.Field({
        key: "reported_capacity",
        fieldType: "integer",
        description: `How many ${brief.storageType} units they can take right now (0 if none)`,
      }),
      guava.Field({
        key: "receiving_cutoff",
        fieldType: "text",
        description: "Latest time today they can receive a delivery (e.g. '6 pm', '24 hours')",
      }),
      guava.Field({
        key: "conditions",
        fieldType: "text",
        required: false,
        description: "Any conditions or caveats on accepting (time limits, paperwork, partial quantity). Empty if none.",
      }),
      guava.Field({
        key: "answer_summary",
        fieldType: "text",
        description: "Close paraphrase of the coordinator's whole answer, including hesitation or contradictions",
      }),
    ],
  });
}

agent.onTaskComplete("coordinator_response", async (call) => {
  const brief = calls.get(call.id)?.brief;
  if (!brief) return call.hangup();
  const answer = {
    reportedCapacity: await int(call, "reported_capacity"),
    receivingCutoff: await str(call, "receiving_cutoff"),
    conditions: await str(call, "conditions"),
    transcript: "",
  };
  answer.transcript = `${await str(call, "answer_summary")} (capacity: ${answer.reportedCapacity ?? "not given"}; ` +
    `receiving until: ${answer.receivingCutoff || "not given"}; conditions: ${answer.conditions || "none"})`;
  try {
    const result = await submitCoordinatorAnswer(brief, answer, jevJudge);
    logger.info("%s -> %s (%s)", brief.facilityName, result.assessment.status, result.assessment.reasons.join("; "));
    await call.hangup(coordinatorClosingLine(result));
  } catch (err) {
    logger.error("Coordinator response failed: %s", err);
    await call.hangup("Apologize: the answer could not be saved due to a system error. Ask them to call back. Say goodbye.");
  }
});

// --- staff approval ---

async function startApproval(call: guava.Call) {
  const found = findIncidentForApproval();
  if (!found) return call.hangup("Tell the staff member there are no open incidents right now. Say goodbye.");
  if (!found.options.length) {
    return call.hangup(
      "Tell the staff member an incident is open but no backup site has confirmed yet, so there is nothing to approve. " +
        "Do not suggest any site. Say you will have options once coordinators respond. Say goodbye.",
    );
  }
  calls.get(call.id)!.approval = found;
  await call.setTask({
    taskId: "staff_approval",
    objective:
      "Present the recommended backup site and evidence to the staff member and record their decision. " +
      "Read statuses exactly: never call a CONDITIONAL site confirmed. Nothing is dispatched without approval.",
    checklist: [
      guava.Field({ key: "staff_name", fieldType: "text", description: "Staff member's name, for the audit record" }),
      guava.Say(approvalScript(found.incident, found.options)),
      guava.Field({
        key: "decision",
        fieldType: "multiple_choice",
        choices: ["approve", "reject", "pick another"],
        question: "Do you approve the recommended site, reject it, or want to pick another listed option?",
      }),
      guava.Field({
        key: "alternate_option",
        fieldType: "text",
        required: false,
        description: "Only if they chose 'pick another': which listed option (number or site name)",
      }),
      guava.Field({ key: "reason", fieldType: "text", required: false, description: "Optional reason for the decision" }),
    ],
  });
}

agent.onTaskComplete("staff_approval", async (call) => {
  const state = calls.get(call.id);
  if (!state?.approval) return call.hangup();
  const choice = (await str(call, "decision")).toLowerCase() as StaffChoice;
  const name = (await str(call, "staff_name")) || "unnamed staff";
  if (!["approve", "reject", "pick another"].includes(choice)) {
    return call.hangup("Tell the staff member no decision was recorded because the answer was unclear, and nothing will be dispatched. Ask them to call back. Say goodbye.");
  }
  const outcome = recordStaffDecision({
    incident: state.approval.incident,
    options: state.approval.options,
    choice,
    alternate: await str(call, "alternate_option"),
    decidedBy: `${name} (staff, ${state.fromNumber ?? "test session"})`,
    reason: (await str(call, "reason")) || null,
  });
  logger.info("Staff decision: %s", outcome.message);
  await call.hangup(`Read this back to the staff member: "${outcome.message}" Then thank them and say goodbye.`);
});

agent.onSessionEnd(async (call) => {
  calls.delete(call.id);
});

export { agent };

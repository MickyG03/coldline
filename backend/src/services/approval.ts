import type { Decision, FacilityResponse, Incident } from "../database/models/index.ts";
import { insertDecision, listActiveIncidents, listDecisions, listFacilityResponses } from "../database/queries/index.ts";
import { getFacility, type Facility } from "../database/seed/index.ts";
import { bus } from "../utils/events.ts";
import { changeIncidentStatus } from "./incidents.ts";

// Staff approval. Only confirmed or conditional sites are ever offered; unknown/incomplete
// sites are never presented, and nothing is dispatched without a recorded decision.

export interface ApprovalOption {
  rank: number;
  facility: Facility;
  response: FacilityResponse;
  status: "confirmed" | "conditional";
}

/** Confirmed first, then conditional (with conditions stated); each ranked by drive time. */
export function rankOptions(responses: FacilityResponse[]): ApprovalOption[] {
  const order = { confirmed: 0, conditional: 1 } as const;
  return responses
    .filter((r): r is FacilityResponse & { status: "confirmed" | "conditional" } =>
      r.status === "confirmed" || (r.status === "conditional" && !!r.conditions?.trim()))
    .flatMap((r) => {
      const facility = getFacility(r.facilityId);
      return facility ? [{ facility, response: r, status: r.status }] : [];
    })
    .sort((a, b) => order[a.status] - order[b.status] ||
      (a.response.driveMinutes ?? Infinity) - (b.response.driveMinutes ?? Infinity))
    .map((o, i) => ({ ...o, rank: i + 1 }));
}

/** The incident staff should decide on now: newest active one with responses awaiting review. */
export function findIncidentForApproval(): { incident: Incident; options: ApprovalOption[] } | undefined {
  for (const incident of listActiveIncidents()) {
    const rejected = new Set(listDecisions(incident.id).filter((d) => d.decision === "rejected").map((d) => d.facilityId));
    const options = rankOptions(listFacilityResponses(incident.id).filter((r) => !rejected.has(r.facilityId)));
    if (options.length) return { incident, options };
  }
  const incident = listActiveIncidents()[0];
  return incident ? { incident, options: [] } : undefined;
}

/** Spoken description. Conditional sites always say "conditional" plus the condition. */
export function describeOption(o: ApprovalOption): string {
  const r = o.response;
  const eta = r.driveMinutes != null ? `${r.driveMinutes} minutes away` : "drive time unknown";
  const evidence = [
    r.reportedCapacity != null ? `reported room for ${r.reportedCapacity} units` : null,
    r.receivingUntil ? (r.receivingUntil === "24h" ? "receives 24 hours" : `receiving until ${r.receivingUntil}`) : null,
  ].filter(Boolean).join(", ");
  const label = o.status === "confirmed"
    ? "CONFIRMED"
    : `CONDITIONAL, not confirmed — condition: ${r.conditions?.split(" | ")[0].replace(/\.+$/, "")}`;
  return `Option ${o.rank}: ${o.facility.name}, ${eta}, ${label}. Evidence: ${evidence || "none recorded"}.`;
}

export function approvalScript(incident: Incident, options: ApprovalOption[]): string {
  const what = incident.products.map((p) => `${p.units} units of ${p.name}`).join(", ");
  return `Incident: ${what}, ${incident.storageType}, urgency ${incident.urgency}` +
    `${incident.excursionOccurred ? ", temperature excursion already occurred" : ""}. ` +
    `Recommended: ${describeOption(options[0])}` +
    (options.length > 1 ? ` Other options: ${options.slice(1).map(describeOption).join(" ")}` : "");
}

/** Match a spoken pick ("option 2", "Glendale", "the depot") to a listed option. */
export function pickOption(options: ApprovalOption[], text: string | null | undefined): ApprovalOption | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  const num = t.match(/\b(\d)\b/) ?? t.match(/\b(one|two|three|four)\b/);
  if (num) {
    const n = /\d/.test(num[1]) ? parseInt(num[1]) : ["one", "two", "three", "four"].indexOf(num[1]) + 1;
    const hit = options.find((o) => o.rank === n);
    if (hit) return hit;
  }
  const words = t.split(/\W+/).filter((w) => w.length > 3);
  return options.find((o) => words.some((w) => o.facility.name.toLowerCase().includes(w)));
}

export type StaffChoice = "approve" | "reject" | "pick another";

export interface ApprovalOutcome {
  decision: Decision | null;
  chosen: ApprovalOption | null;
  message: string;
}

export function recordStaffDecision(input: {
  incident: Incident;
  options: ApprovalOption[];
  choice: StaffChoice;
  alternate?: string | null;
  decidedBy: string;
  reason?: string | null;
}): ApprovalOutcome {
  const { incident, options } = input;
  if (!options.length) return { decision: null, chosen: null, message: "No viable option to decide on." };

  let chosen: ApprovalOption | undefined = options[0];
  if (input.choice === "pick another") {
    chosen = pickOption(options, input.alternate);
    if (!chosen) return { decision: null, chosen: null, message: `Could not match "${input.alternate}" to a listed option; nothing recorded.` };
  }
  const value = input.choice === "reject" ? "rejected" : "approved";
  const decision = insertDecision({
    incidentId: incident.id,
    facilityId: chosen.facility.id,
    decidedBy: input.decidedBy,
    decision: value,
    reason: input.reason ?? (chosen.status === "conditional" ? `approved with condition: ${chosen.response.conditions?.split(" | ")[0]}` : null),
  });
  bus.publish("decision.made", { decision });
  if (value === "approved") changeIncidentStatus(incident.id, "approved");
  return {
    decision,
    chosen,
    message: value === "approved"
      ? `Approved transfer to ${chosen.facility.name}${chosen.status === "conditional" ? " (conditional — condition must be met)" : ""}.`
      : `Rejected ${chosen.facility.name}; incident stays open for other options.`,
  };
}

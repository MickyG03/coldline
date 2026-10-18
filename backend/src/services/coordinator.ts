import { computeDriveRoute } from "../application/google/routes.ts";
import { noulConfidence, type AnswerJudgment, type Judge } from "../application/typesafe/jev.ts";
import type { FacilityResponse, FacilityResponseStatus, Incident } from "../database/models/index.ts";
import {
  getFacilityResponse, listActiveIncidentsForFacility, listFacilityResponses, upsertFacilityResponse,
} from "../database/queries/index.ts";
import { getFacility, getPharmacy } from "../database/seed/index.ts";
import { clockNow } from "../utils/clock.ts";
import { bus } from "../utils/events.ts";
import { changeIncidentStatus } from "./incidents.ts";

// Coordinator call-in: read the open request, judge the answer with Jev, then apply hard
// rules in code (capacity >= units, can arrive before receiving cutoff). Never guess.

export const MIN_JEV_CONFIDENCE = 0.6;
const TZ = "America/Los_Angeles"; // all seed sites are in LA

export interface RequestBrief {
  incident: Incident;
  facilityId: string;
  facilityName: string;
  pharmacyName: string;
  products: string;
  units: number;
  storageType: string;
  driveMinutes: number | null;
}

/** Newest active incident that matched this facility, with drive time for the read-out. */
export async function findRequestForFacility(facilityId: string): Promise<RequestBrief | undefined> {
  const incident = listActiveIncidentsForFacility(facilityId)[0];
  const facility = getFacility(facilityId);
  if (!incident || !facility) return undefined;
  const pharmacy = getPharmacy(incident.pharmacyId)!;
  let driveMinutes = getFacilityResponse(incident.id, facilityId)?.driveMinutes ?? null;
  if (driveMinutes == null) {
    try {
      driveMinutes = Math.round((await computeDriveRoute(pharmacy, facility)).durationSeconds / 60);
    } catch { /* read out without an ETA */ }
  }
  return {
    incident,
    facilityId,
    facilityName: facility.name,
    pharmacyName: pharmacy.name,
    products: incident.products.map((p) => `${p.units} units of ${p.name}`).join(", "),
    units: incident.totalUnits,
    storageType: incident.storageType,
    driveMinutes,
  };
}

export function requestScript(b: RequestBrief): string {
  const eta = b.driveMinutes != null ? `about ${b.driveMinutes} minutes away by car` : "a short drive away";
  return `${b.pharmacyName} has a cold-storage failure and needs ${b.storageType} space for ${b.products}, ` +
    `${b.units} units in total. They are ${eta}.`;
}

/** Parse a spoken receiving cutoff into minutes after midnight; "always" for 24h; null if unclear. */
export function parseCutoff(text: string | null | undefined): number | "always" | null {
  if (!text) return null;
  const t = String(text).toLowerCase();
  if (/24\s*(h|hours|\/7)|around the clock|always|all (day|night)|any ?time/.test(t)) return "always";
  if (/midnight/.test(t)) return 24 * 60;
  if (/noon/.test(t)) return 12 * 60;
  const m = t.match(/(\d{1,2})(?::|\.)?(\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = m[2] ? parseInt(m[2]) : 0;
  const ampm = m[3]?.[0];
  if (h > 24 || min > 59) return null;
  if (ampm === "p" && h < 12) h += 12;
  if (ampm === "a" && h === 12) h = 0;
  // "closes at six" with no am/pm: receiving cutoffs are afternoon/evening
  if (!ampm && !m[2] && h >= 1 && h <= 11) h += 12;
  return h * 60 + min;
}

const formatCutoff = (c: number | "always") =>
  c === "always" ? "24h" : `${String(Math.floor(c / 60) % 24).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;

/** Minutes after local midnight at the facility. */
export function localMinutes(at: Date = clockNow()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "numeric", hourCycle: "h23" })
    .formatToParts(at);
  const get = (k: string) => parseInt(parts.find((p) => p.type === k)?.value ?? "0");
  return get("hour") * 60 + get("minute");
}

export interface CoordinatorAnswer {
  reportedCapacity: number | null;
  receivingCutoff: string;
  conditions: string;
  transcript: string;
}

export interface Assessment {
  status: FacilityResponseStatus;
  reasons: string[];
  capacityOk: boolean | null;
  cutoffOk: boolean | null;
  receivingUntil: string | null;
}

/** Pure decision rule: Jev labels + code checks -> facility status. */
export function assessResponse(
  a: CoordinatorAnswer, j: AnswerJudgment, units: number, driveMinutes: number | null, nowMinutes: number,
): Assessment {
  const reasons: string[] = [];
  const cutoff = parseCutoff(a.receivingCutoff);
  const capacityOk = a.reportedCapacity == null ? null : a.reportedCapacity >= units;
  const arrival = nowMinutes + (driveMinutes ?? 0);
  const cutoffOk = cutoff == null ? null : cutoff === "always" ? true : arrival <= cutoff;
  const out = (status: FacilityResponseStatus): Assessment =>
    ({ status, reasons, capacityOk, cutoffOk, receivingUntil: cutoff == null ? null : formatCutoff(cutoff) });

  if (j.answerConfidence < MIN_JEV_CONFIDENCE) {
    reasons.push(`Jev confidence ${j.answerConfidence.toFixed(2)} below ${MIN_JEV_CONFIDENCE}; not guessing`);
    return out("incomplete");
  }
  if (j.answerStatus === "contradictory") { reasons.push("answer contradicts itself"); return out("contradictory"); }
  if (j.answerStatus === "incomplete") { reasons.push("answer missing key details"); return out("incomplete"); }
  if (noulConfidence(j.hasCapacity) < 0.4) { reasons.push("unclear whether there is room"); return out("incomplete"); }
  if (j.hasCapacity < 0.5) { reasons.push("coordinator says no room"); return out("unavailable"); }
  if (capacityOk === null) { reasons.push("no unit count given"); return out("incomplete"); }
  if (!capacityOk) { reasons.push(`reported capacity ${a.reportedCapacity} < ${units} units`); return out("unavailable"); }
  if (cutoffOk === null) { reasons.push("receiving cutoff unclear"); return out("incomplete"); }
  if (!cutoffOk) {
    reasons.push(`arrival ~${formatCutoff(arrival % (24 * 60))} after receiving cutoff ${formatCutoff(cutoff!)}`);
    return out("unavailable");
  }
  // Uncertain about conditions -> treat as conditional; never upgrade to confirmed on a maybe.
  if (j.answerStatus === "conditional" || j.hasCondition >= 0.3) {
    reasons.push(a.conditions ? "conditional acceptance (condition stated)" : "conditional acceptance (condition not spelled out)");
    return out("conditional");
  }
  reasons.push(`capacity ${a.reportedCapacity} >= ${units}, arrives before ${formatCutoff(cutoff!)}`);
  return out("confirmed");
}

export interface CoordinatorResult {
  response: FacilityResponse;
  assessment: Assessment;
  judgment: AnswerJudgment;
}

export async function submitCoordinatorAnswer(
  brief: RequestBrief, answer: CoordinatorAnswer, judge: Judge, now: Date = clockNow(),
): Promise<CoordinatorResult> {
  const { incident, facilityId } = brief;
  // "none" / "no other conditions" means no condition
  if (/^(no|none|nope|n\/a|no (other |additional )?(conditions?|caveats?))\.?$/i.test(answer.conditions.trim())) {
    answer = { ...answer, conditions: "" };
  }
  answer = { ...answer, conditions: answer.conditions.trim() };
  const before = getFacilityResponse(incident.id, facilityId);
  const judgment = await judge.judgeAnswer({
    request: requestScript(brief),
    units_needed: brief.units,
    coordinator_said: answer.transcript,
    reported_capacity_units: answer.reportedCapacity,
    receiving_cutoff: answer.receivingCutoff,
    conditions: answer.conditions || "none stated",
  });
  const assessment = assessResponse(answer, judgment, brief.units, brief.driveMinutes, localMinutes(now));
  const response = upsertFacilityResponse(incident.id, facilityId, {
    status: assessment.status,
    rawText: answer.transcript,
    jevLabels: judgment.labels,
    reportedCapacity: answer.reportedCapacity,
    receivingUntil: assessment.receivingUntil,
    conditions: [answer.conditions, ...assessment.reasons].filter(Boolean).join(" | "),
    respondedAt: now.toISOString(),
    driveMinutes: brief.driveMinutes,
  });
  bus.publish("response.judged", { incidentId: incident.id, facilityId, response, labels: judgment.labels });
  bus.publish("facility.status_changed", { incidentId: incident.id, facilityId, from: before?.status ?? null, to: response.status });

  const viable = listFacilityResponses(incident.id).some((r) => r.status === "confirmed" || r.status === "conditional");
  if (viable && incident.status !== "recommended") changeIncidentStatus(incident.id, "recommended");
  return { response, assessment, judgment };
}

export function coordinatorClosingLine(r: CoordinatorResult): string {
  switch (r.assessment.status) {
    case "confirmed":
      return "Thank the coordinator, confirm you have recorded that they can receive the units, and explain a staff member must approve before anything is sent. Say goodbye.";
    case "conditional":
      return "Thank the coordinator, read back the condition you recorded, and explain a staff member will review it before anything is sent. Say goodbye.";
    case "unavailable":
      return "Thank the coordinator and let them know you have recorded that they cannot take this shipment. Say goodbye.";
    default:
      return "Thank the coordinator. Say their answer was recorded as incomplete, so a staff member may call back to clarify. Say goodbye.";
  }
}

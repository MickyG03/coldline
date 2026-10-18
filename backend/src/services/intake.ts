import type { Judge, TriageResult } from "../application/typesafe/jev.ts";
import type { Incident, StorageType, Urgency } from "../database/models/index.ts";
import { upsertFacilityResponse } from "../database/queries/index.ts";
import { getPharmacy } from "../database/seed/index.ts";
import { bus } from "../utils/events.ts";
import { changeIncidentStatus, openIncident } from "./incidents.ts";
import { matchFacilities, type MatchResult } from "./matcher.ts";

// Pharmacy intake: collected fields -> Jev triage -> incident -> matcher -> responses set to unknown.
// Inventory only: product names and unit counts, never patient data.

export interface IntakeInput {
  pharmacyId: string;
  product: string;
  units: number;
  /** What the caller said (may be "not sure"); Jev decides the stored storage type. */
  reportedStorage: string;
  /** Free text from the caller, e.g. "9.4", "about 10 degrees", "46 F". */
  currentTemp: string;
  minutesSinceFailure: number | null;
}

export interface IntakeResult {
  incident: Incident;
  triage: TriageResult;
  match: MatchResult;
}

/** Parse a spoken temperature into °C. Numbers above 20 with no unit are treated as Fahrenheit. */
export function parseTemperatureC(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = String(text).match(/(-|minus\s*)?\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  let v = parseFloat(m[2]) * (m[1] ? -1 : 1);
  const fahrenheit = /\bf\b|fahrenheit/i.test(text) || (!/\bc\b|celsius/i.test(text) && v > 20);
  if (fahrenheit) v = ((v - 32) * 5) / 9;
  return Math.round(v * 10) / 10;
}

const URGENCIES: Urgency[] = ["low", "medium", "high", "critical"];
export const urgencyFromScore = (s: number): Urgency => URGENCIES[Math.min(3, Math.max(0, Math.round(s)))];

const REPORTED: Record<string, StorageType> = {
  refrigerated: "refrigerated", fridge: "refrigerated", frozen: "frozen", freezer: "frozen",
  "ultra-cold": "ultra-cold", "ultra cold": "ultra-cold",
};

/** Jev's storage call wins unless it is unsure and the caller named a class. */
export function chooseStorage(triage: TriageResult, reported: string): StorageType {
  const said = REPORTED[reported.trim().toLowerCase()];
  return triage.storageConfidence < 0.6 && said ? said : triage.storageType;
}

export async function submitIntake(input: IntakeInput, judge: Judge): Promise<IntakeResult> {
  const pharmacy = getPharmacy(input.pharmacyId);
  if (!pharmacy) throw new Error(`unknown pharmacy ${input.pharmacyId}`);
  const currentTempC = parseTemperatureC(input.currentTemp);

  const triage = await judge.triage({
    pharmacy: pharmacy.name,
    product: input.product,
    units: input.units,
    storage_reported_by_caller: input.reportedStorage,
    current_temperature: input.currentTemp,
    current_temperature_c: currentTempC,
    minutes_since_failure: input.minutesSinceFailure,
    note: "Vaccine storage ranges: refrigerated 2-8 °C, frozen -50 to -15 °C, ultra-cold -90 to -60 °C.",
  });

  const incident = openIncident({
    pharmacyId: pharmacy.id,
    products: [{ name: input.product, units: input.units }],
    storageType: chooseStorage(triage, input.reportedStorage),
    currentTempC,
    minutesSinceFailure: input.minutesSinceFailure,
    urgency: urgencyFromScore(triage.urgencyScore),
    excursionOccurred: triage.excursion >= 0.5,
    triage: triage.labels,
  });

  changeIncidentStatus(incident.id, "matching");
  const match = await matchFacilities(incident);
  for (const c of match.candidates) {
    const response = upsertFacilityResponse(incident.id, c.facility.id, { status: "unknown", driveMinutes: c.driveMinutes, driveKm: c.driveKm });
    bus.publish("facility.status_changed", { incidentId: incident.id, facilityId: c.facility.id, from: null, to: response.status });
  }
  const final = changeIncidentStatus(incident.id, "awaiting_responses");
  return { incident: final, triage, match };
}

/** What the agent tells the pharmacy once intake is done. */
export function intakeClosingLine(r: IntakeResult): string {
  const n = r.match.candidates.length;
  const units = `${r.incident.totalUnits} ${r.incident.storageType} units`;
  if (!n) {
    return `Tell the caller the incident is logged for ${units}, but none of their preapproved backup sites ` +
      `can take it right now, so a staff member will follow up directly. Keep the unit door closed.`;
  }
  return `Tell the caller the incident is logged for ${units}, urgency ${r.incident.urgency}, and that ` +
    `${n} preapproved backup site${n === 1 ? " is" : "s are"} being contacted now. A staff member must approve ` +
    `any move before anything is dispatched. Advise keeping the unit door closed. Then say goodbye.`;
}

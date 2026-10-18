import { randomUUID } from "node:crypto";
import { getDb } from "../config/index.ts";
import type {
  AuditLogEntry, Decision, DecisionValue, FacilityResponse, FacilityResponseStatus,
  Incident, IncidentStatus, JevLabels, ProductAtRisk, StorageType, Urgency,
} from "../models/index.ts";

// Plain data access. State changes should go through services that also publish
// on the event bus (which writes the audit_log row).

type Row = Record<string, any>;
const now = () => new Date().toISOString();
const json = (v: unknown) => (v == null ? null : JSON.stringify(v));
const parse = <T>(v: unknown): T | null => (typeof v === "string" ? JSON.parse(v) : null);

const toIncident = (r: Row): Incident => ({
  id: r.id,
  pharmacyId: r.pharmacy_id,
  products: parse<ProductAtRisk[]>(r.products) ?? [],
  totalUnits: r.total_units,
  storageType: r.storage_type,
  currentTempC: r.current_temp_c,
  minutesSinceFailure: r.minutes_since_failure,
  urgency: r.urgency,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toResponse = (r: Row): FacilityResponse => ({
  id: r.id,
  incidentId: r.incident_id,
  facilityId: r.facility_id,
  status: r.status,
  rawText: r.raw_text,
  jevLabels: parse<JevLabels>(r.jev_labels),
  reportedCapacity: r.reported_capacity,
  receivingUntil: r.receiving_until,
  conditions: r.conditions,
  respondedAt: r.responded_at,
  updatedAt: r.updated_at,
});

const toDecision = (r: Row): Decision => ({
  id: r.id,
  incidentId: r.incident_id,
  facilityId: r.facility_id,
  decidedBy: r.decided_by,
  decision: r.decision,
  reason: r.reason,
  decidedAt: r.decided_at,
});

// --- incidents ---

export interface NewIncident {
  pharmacyId: string;
  products: ProductAtRisk[];
  storageType: StorageType;
  currentTempC?: number | null;
  minutesSinceFailure?: number | null;
  urgency: Urgency;
}

export function insertIncident(input: NewIncident): Incident {
  const ts = now();
  const id = randomUUID();
  getDb().prepare(
    `INSERT INTO incidents (id, pharmacy_id, products, total_units, storage_type, current_temp_c,
       minutes_since_failure, urgency, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
  ).run(
    id, input.pharmacyId, JSON.stringify(input.products),
    input.products.reduce((n, p) => n + p.units, 0), input.storageType,
    input.currentTempC ?? null, input.minutesSinceFailure ?? null, input.urgency, ts, ts,
  );
  return getIncident(id)!;
}

export function getIncident(id: string): Incident | undefined {
  const row = getDb().prepare("SELECT * FROM incidents WHERE id = ?").get(id);
  return row ? toIncident(row) : undefined;
}

export function listIncidents(): Incident[] {
  return getDb().prepare("SELECT * FROM incidents ORDER BY created_at DESC").all().map(toIncident);
}

export type IncidentPatch = Partial<Pick<Incident, "status" | "currentTempC" | "minutesSinceFailure" | "urgency">>;

const incidentCols: Record<keyof IncidentPatch, string> = {
  status: "status",
  currentTempC: "current_temp_c",
  minutesSinceFailure: "minutes_since_failure",
  urgency: "urgency",
};

export function updateIncident(id: string, patch: IncidentPatch): Incident {
  const keys = (Object.keys(patch) as (keyof IncidentPatch)[]).filter((k) => patch[k] !== undefined);
  const sets = [...keys.map((k) => `${incidentCols[k]} = ?`), "updated_at = ?"];
  getDb().prepare(`UPDATE incidents SET ${sets.join(", ")} WHERE id = ?`)
    .run(...keys.map((k) => patch[k] as string | number | null), now(), id);
  const incident = getIncident(id);
  if (!incident) throw new Error(`incident ${id} not found`);
  return incident;
}

export const setIncidentStatus = (id: string, status: IncidentStatus) => updateIncident(id, { status });

// --- facility responses (one row per incident+facility, upserted) ---

export interface ResponsePatch {
  status: FacilityResponseStatus;
  rawText?: string | null;
  jevLabels?: JevLabels | null;
  reportedCapacity?: number | null;
  receivingUntil?: string | null;
  conditions?: string | null;
  respondedAt?: string | null;
}

export function upsertFacilityResponse(incidentId: string, facilityId: string, p: ResponsePatch): FacilityResponse {
  getDb().prepare(
    `INSERT INTO facility_responses (id, incident_id, facility_id, status, raw_text, jev_labels,
       reported_capacity, receiving_until, conditions, responded_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (incident_id, facility_id) DO UPDATE SET
       status = excluded.status,
       raw_text = COALESCE(excluded.raw_text, raw_text),
       jev_labels = COALESCE(excluded.jev_labels, jev_labels),
       reported_capacity = COALESCE(excluded.reported_capacity, reported_capacity),
       receiving_until = COALESCE(excluded.receiving_until, receiving_until),
       conditions = COALESCE(excluded.conditions, conditions),
       responded_at = COALESCE(excluded.responded_at, responded_at),
       updated_at = excluded.updated_at`,
  ).run(
    randomUUID(), incidentId, facilityId, p.status, p.rawText ?? null, json(p.jevLabels),
    p.reportedCapacity ?? null, p.receivingUntil ?? null, p.conditions ?? null, p.respondedAt ?? null, now(),
  );
  return getFacilityResponse(incidentId, facilityId)!;
}

export function getFacilityResponse(incidentId: string, facilityId: string): FacilityResponse | undefined {
  const row = getDb().prepare("SELECT * FROM facility_responses WHERE incident_id = ? AND facility_id = ?")
    .get(incidentId, facilityId);
  return row ? toResponse(row) : undefined;
}

export function listFacilityResponses(incidentId: string): FacilityResponse[] {
  return getDb().prepare("SELECT * FROM facility_responses WHERE incident_id = ? ORDER BY updated_at")
    .all(incidentId).map(toResponse);
}

// --- decisions ---

export function insertDecision(input: {
  incidentId: string;
  facilityId: string;
  decidedBy: string;
  decision: DecisionValue;
  reason?: string | null;
}): Decision {
  const id = randomUUID();
  getDb().prepare(
    `INSERT INTO decisions (id, incident_id, facility_id, decided_by, decision, reason, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.incidentId, input.facilityId, input.decidedBy, input.decision, input.reason ?? null, now());
  return toDecision(getDb().prepare("SELECT * FROM decisions WHERE id = ?").get(id)!);
}

export function listDecisions(incidentId: string): Decision[] {
  return getDb().prepare("SELECT * FROM decisions WHERE incident_id = ? ORDER BY decided_at")
    .all(incidentId).map(toDecision);
}

// --- audit log ---

export function insertAudit(incidentId: string | null, eventType: string, payload: unknown): AuditLogEntry {
  const ts = now();
  const res = getDb().prepare(
    "INSERT INTO audit_log (incident_id, event_type, payload, created_at) VALUES (?, ?, ?, ?)",
  ).run(incidentId, eventType, JSON.stringify(payload), ts);
  return { id: Number(res.lastInsertRowid), incidentId, eventType, payload, createdAt: ts };
}

export function listAudit(incidentId?: string): AuditLogEntry[] {
  const rows = incidentId
    ? getDb().prepare("SELECT * FROM audit_log WHERE incident_id = ? ORDER BY id").all(incidentId)
    : getDb().prepare("SELECT * FROM audit_log ORDER BY id").all();
  return rows.map((r: Row) => ({
    id: r.id,
    incidentId: r.incident_id,
    eventType: r.event_type,
    payload: JSON.parse(r.payload),
    createdAt: r.created_at,
  }));
}

// Table definitions and row types for the Coldline incident store.

export type StorageType = "refrigerated" | "frozen" | "ultra-cold";
export type Urgency = "low" | "medium" | "high" | "critical";
export type IncidentStatus =
  | "open" | "matching" | "awaiting_responses" | "recommended" | "approved" | "rejected" | "closed";
export type FacilityResponseStatus =
  | "unknown" | "calling" | "confirmed" | "conditional" | "unavailable" | "contradictory" | "incomplete";
export type DecisionValue = "approved" | "rejected";

export interface ProductAtRisk {
  name: string;
  units: number;
}

export interface Incident {
  id: string;
  pharmacyId: string;
  products: ProductAtRisk[];
  totalUnits: number;
  storageType: StorageType;
  currentTempC: number | null;
  minutesSinceFailure: number | null;
  urgency: Urgency;
  /** Jev triage: did the product leave its labeled storage range? null = not triaged. */
  excursionOccurred: boolean | null;
  /** Jev triage labels (storage type / urgency / excursion probabilities). */
  triage: JevLabels | null;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
}

/** Jev label -> confidence (0..1), e.g. { definite: 0.91, conditional: 0.12 } */
export type JevLabels = Record<string, number>;

export interface FacilityResponse {
  id: string;
  incidentId: string;
  facilityId: string;
  status: FacilityResponseStatus;
  rawText: string | null;
  jevLabels: JevLabels | null;
  reportedCapacity: number | null;
  receivingUntil: string | null;
  conditions: string | null;
  respondedAt: string | null;
  /** Drive time from the pharmacy (Google Routes), set when the facility is matched. */
  driveMinutes: number | null;
  updatedAt: string;
}

export interface Decision {
  id: string;
  incidentId: string;
  facilityId: string;
  decidedBy: string;
  decision: DecisionValue;
  reason: string | null;
  decidedAt: string;
}

export interface AuditLogEntry {
  id: number;
  incidentId: string | null;
  eventType: string;
  payload: unknown;
  createdAt: string;
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL,
  products TEXT NOT NULL,
  total_units INTEGER NOT NULL,
  storage_type TEXT NOT NULL CHECK (storage_type IN ('refrigerated','frozen','ultra-cold')),
  current_temp_c REAL,
  minutes_since_failure INTEGER,
  urgency TEXT NOT NULL CHECK (urgency IN ('low','medium','high','critical')),
  excursion_occurred INTEGER,
  triage TEXT,
  status TEXT NOT NULL CHECK (status IN ('open','matching','awaiting_responses','recommended','approved','rejected','closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facility_responses (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id),
  facility_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('unknown','calling','confirmed','conditional','unavailable','contradictory','incomplete')),
  raw_text TEXT,
  jev_labels TEXT,
  reported_capacity INTEGER,
  receiving_until TEXT,
  conditions TEXT,
  responded_at TEXT,
  drive_minutes INTEGER,
  updated_at TEXT NOT NULL,
  UNIQUE (incident_id, facility_id)
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id),
  facility_id TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  reason TEXT,
  decided_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id TEXT,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_responses_incident ON facility_responses(incident_id);
CREATE INDEX IF NOT EXISTS idx_audit_incident ON audit_log(incident_id);
`;

/** Columns added after the first release; applied to existing databases by getDb(). */
export const MIGRATIONS: { table: string; column: string; ddl: string }[] = [
  { table: "incidents", column: "excursion_occurred", ddl: "ALTER TABLE incidents ADD COLUMN excursion_occurred INTEGER" },
  { table: "incidents", column: "triage", ddl: "ALTER TABLE incidents ADD COLUMN triage TEXT" },
  { table: "facility_responses", column: "drive_minutes", ddl: "ALTER TABLE facility_responses ADD COLUMN drive_minutes INTEGER" },
];

// Response shapes for the operations in operations.ts (mirrors backend/src/schemas).

export type FacilityStatus =
  | "unknown" | "calling" | "confirmed" | "conditional" | "unavailable" | "contradictory" | "incomplete";
export type IncidentStatus =
  | "open" | "matching" | "awaiting_responses" | "recommended" | "approved" | "rejected" | "closed";

export interface JevLabel { label: string; confidence: number }

export interface Facility {
  id: string;
  name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  receivingHours: string;
  straightKm: number;
  capacity: { refrigerated: number; frozen: number; ultraCold: number };
}

export interface Pharmacy {
  id: string;
  name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  staffName: string;
}

export interface Answer {
  at: string;
  status: FacilityStatus;
  text: string | null;
  labels: JevLabel[];
  reportedCapacity: number | null;
  receivingUntil: string | null;
  conditions: string | null;
}

export interface IncidentFacility {
  facility: Facility;
  status: FacilityStatus;
  labels: JevLabel[];
  confidence: number | null;
  reportedCapacity: number | null;
  receivingUntil: string | null;
  conditions: string | null;
  respondedAt: string | null;
  driveMinutes: number | null;
  driveKm: number | null;
  answers: Answer[];
}

export interface Recommendation {
  rank: number;
  status: FacilityStatus;
  summary: string;
  facility: { id: string; name: string };
}

export interface Decision {
  id: string;
  facility: { id: string; name: string } | null;
  decidedBy: string;
  decision: "approved" | "rejected";
  reason: string | null;
  decidedAt: string;
}

export interface TranscriptLine { at: string; caller: string; facilityId: string | null; speaker: "agent" | "caller"; text: string }

export interface Alert {
  id: number;
  at: string;
  kind: "coordinator_request" | "staff_recommendation";
  recipient: string;
  to: string | null;
  message: string;
  status: "sent" | "simulated" | "failed";
  detail: string | null;
}

export interface Incident {
  id: string;
  code: string;
  pharmacy: Pharmacy;
  products: { name: string; units: number }[];
  totalUnits: number;
  storageType: "refrigerated" | "frozen" | "ultra_cold";
  currentTempC: number | null;
  minutesSinceFailure: number | null;
  urgency: "low" | "medium" | "high" | "critical";
  excursionOccurred: boolean | null;
  triage: JevLabel[];
  status: IncidentStatus;
  createdAt: string;
  facilities: IncidentFacility[];
  recommendation: Recommendation | null;
  options: Recommendation[];
  decisions: Decision[];
  transcript: TranscriptLine[];
  alerts: Alert[];
}

export interface Network {
  pharmacy: Pharmacy;
  facilities: Facility[];
  connected: number;
  readyToReceive: number;
  nearestBackupMinutes: number | null;
}

export interface DemoStatus {
  simulating: boolean;
  redteam: boolean;
  businessClock: string;
  sms: "on" | "off";
  lastError: string | null;
}

export interface Route { facilityId: string; encodedPolyline: string; durationMinutes: number; distanceKm: number }

export interface BusEvent { type: string; incidentId: string | null; auditId: number; at: string; payload: unknown }

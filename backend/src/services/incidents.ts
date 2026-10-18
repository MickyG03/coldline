import type { IncidentStatus } from "../database/models/index.ts";
import { insertIncident, setIncidentStatus, type NewIncident } from "../database/queries/index.ts";
import { bus } from "../utils/events.ts";

// State-changing incident operations: write the row, then publish (which writes the audit row).

export function openIncident(input: NewIncident) {
  const incident = insertIncident(input);
  bus.publish("incident.opened", { incident });
  return incident;
}

export function changeIncidentStatus(id: string, status: IncidentStatus) {
  const incident = setIncidentStatus(id, status);
  bus.publish("incident.updated", { incident, changes: ["status"] });
  return incident;
}

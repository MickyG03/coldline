/**
 * Opens a fake incident, runs the facility matcher, and prints the audit trail.
 *   npm run demo:incident
 */

import { listAudit, upsertFacilityResponse } from "../src/database/queries/index.ts";
import { getPharmacy } from "../src/database/seed/index.ts";
import { changeIncidentStatus, openIncident } from "../src/services/incidents.ts";
import { matchFacilities } from "../src/services/matcher.ts";
import { bus } from "../src/utils/events.ts";

const pharmacy = getPharmacy("eastside-rx")!;
const incident = openIncident({
  pharmacyId: pharmacy.id,
  products: [
    { name: "Influenza vaccine (synthetic)", units: 200 },
    { name: "Hepatitis B vaccine (synthetic)", units: 100 },
  ],
  storageType: "refrigerated",
  currentTempC: 9.4,
  minutesSinceFailure: 25,
  urgency: "high",
});
console.log(`Incident ${incident.id}`);
console.log(`  ${pharmacy.name}: ${incident.totalUnits} ${incident.storageType} units, ` +
  `${incident.currentTempC}°C, ${incident.minutesSinceFailure} min since failure\n`);

changeIncidentStatus(incident.id, "matching");
const { candidates, excluded } = await matchFacilities(incident);

console.log("Ranked candidates:");
candidates.forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.facility.name.padEnd(36)} ${String(c.driveMinutes).padStart(3)} min  ` +
    `${c.driveKm.toFixed(1).padStart(5)} km  capacity ${c.capacity}  (receiving ${c.facility.receivingHours})`);
  const response = upsertFacilityResponse(incident.id, c.facility.id, { status: "unknown" });
  bus.publish("facility.status_changed", {
    incidentId: incident.id, facilityId: c.facility.id, from: null, to: response.status,
  });
});
if (!candidates.length) console.log("  (none)");

console.log("\nExcluded:");
for (const e of excluded) console.log(`  - ${e.facility?.name ?? e.facilityId}: ${e.reason}`);
if (!excluded.length) console.log("  (none)");

changeIncidentStatus(incident.id, "awaiting_responses");

console.log("\nAudit log:");
for (const row of listAudit(incident.id)) {
  console.log(`  #${row.id} ${row.createdAt} ${row.eventType}`);
}

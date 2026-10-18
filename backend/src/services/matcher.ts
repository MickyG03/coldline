import { computeDriveRoute } from "../application/google/routes.ts";
import type { Incident } from "../database/models/index.ts";
import { getFacility, getPharmacy, type Facility } from "../database/seed/index.ts";

// Facility matcher: pharmacy's preapproved backups -> capacity filter -> rank by drive time.

export interface Candidate {
  facility: Facility;
  capacity: number;
  driveMinutes: number;
  driveKm: number;
}

export interface Exclusion {
  facilityId: string;
  facility?: Facility;
  reason: string;
}

export interface MatchResult {
  candidates: Candidate[];
  excluded: Exclusion[];
}

export async function matchFacilities(incident: Incident): Promise<MatchResult> {
  const pharmacy = getPharmacy(incident.pharmacyId);
  if (!pharmacy) throw new Error(`unknown pharmacy ${incident.pharmacyId}`);

  const excluded: Exclusion[] = [];
  const eligible: { facility: Facility; capacity: number }[] = [];
  for (const id of pharmacy.backupFacilityIds) {
    const facility = getFacility(id);
    if (!facility) {
      excluded.push({ facilityId: id, reason: "not found in facility registry" });
      continue;
    }
    const capacity = facility.capacityUnits[incident.storageType] ?? 0;
    if (capacity < incident.totalUnits) {
      excluded.push({
        facilityId: id,
        facility,
        reason: capacity === 0
          ? `no ${incident.storageType} storage`
          : `${incident.storageType} capacity ${capacity} < ${incident.totalUnits} units needed`,
      });
      continue;
    }
    eligible.push({ facility, capacity });
  }

  const routed = await Promise.all(eligible.map(async ({ facility, capacity }) => {
    try {
      const route = await computeDriveRoute(pharmacy, facility);
      const candidate: Candidate = {
        facility,
        capacity,
        driveMinutes: Math.round(route.durationSeconds / 60),
        driveKm: Math.round(route.distanceMeters / 100) / 10,
      };
      return candidate;
    } catch (err) {
      excluded.push({
        facilityId: facility.id,
        facility,
        reason: `no drive route: ${err instanceof Error ? err.message : String(err)}`,
      });
      return undefined;
    }
  }));

  const candidates = routed
    .filter((c): c is Candidate => c !== undefined)
    .sort((a, b) => a.driveMinutes - b.driveMinutes);
  return { candidates, excluded };
}

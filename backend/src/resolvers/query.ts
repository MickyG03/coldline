import { computeDrivePolyline } from "../application/google/routes.ts";
import { smsEnabled } from "../application/guava/sms.ts";
import { getIncident, listAudit, listFacilityResponses, listIncidents } from "../database/queries/index.ts";
import { getFacilities, getFacility, getPharmacies, getPharmacy } from "../database/seed/index.ts";
import { notFound } from "../middleware/index.ts";
import { businessClock, currentIncidentId, demo } from "../services/demo.ts";
import { toAuditEntry } from "./types.ts";

interface RouteGeometry { encodedPolyline: string; durationMinutes: number; distanceKm: number }
const routeCache = new Map<string, Promise<RouteGeometry>>();

/** Active request, else the newest decided one (so a just-approved request stays on screen until reset). */
export function currentIncident() {
  const id = currentIncidentId() ??
    listIncidents().find((i) => !demo.redTeamIncidentIds.has(i.id) && i.status !== "closed")?.id;
  return id ? getIncident(id) : undefined;
}

export const demoStatus = () => ({
  simulating: demo.simulating,
  redteam: demo.redteam,
  businessClock: businessClock(),
  sms: smsEnabled() ? "on" : "off",
  lastError: demo.lastError,
});

export const Query = {
  currentIncident: () => currentIncident() ?? null,
  incident: (_: unknown, { id }: { id: string }) => getIncident(id) ?? null,
  incidents: (_: unknown, { limit }: { limit?: number }) => listIncidents().slice(0, limit ?? 20),
  facilities: () => getFacilities(),

  network: () => {
    const id = currentIncident()?.id;
    const responses = id ? listFacilityResponses(id) : [];
    const drive = responses.map((r) => r.driveMinutes).filter((m): m is number => m != null);
    return {
      pharmacy: getPharmacies()[0],
      facilities: getFacilities(),
      connected: getFacilities().length,
      readyToReceive: responses.filter((r) => r.status === "confirmed" || r.status === "conditional").length,
      nearestBackupMinutes: drive.length ? Math.min(...drive) : null,
    };
  },

  route: async (_: unknown, { incidentId, facilityId }: { incidentId: string; facilityId: string }) => {
    const incident = getIncident(incidentId) ?? notFound("incident", incidentId);
    const facility = getFacility(facilityId) ?? notFound("facility", facilityId);
    const pharmacy = getPharmacy(incident.pharmacyId)!;
    const key = `${pharmacy.id}->${facility.id}`;
    let route = routeCache.get(key);
    if (!route) {
      route = computeDrivePolyline(pharmacy, facility).then((r) => ({
        encodedPolyline: r.encodedPolyline,
        durationMinutes: Math.round(r.durationSeconds / 60),
        distanceKm: Math.round(r.distanceMeters / 100) / 10,
      }));
      route.catch(() => routeCache.delete(key));
      routeCache.set(key, route);
    }
    return { facilityId, ...(await route) };
  },

  audit: (_: unknown, { incidentId, limit }: { incidentId?: string; limit?: number }) =>
    listAudit(incidentId).slice(-(limit ?? 200)).map(toAuditEntry),

  demo: demoStatus,
};

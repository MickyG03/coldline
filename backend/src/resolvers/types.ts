import { GraphQLScalarType } from "graphql";
import type { FacilityResponse, Incident, JevLabels } from "../database/models/index.ts";
import { incidentCode, listAudit, listDecisions, listFacilityResponses, listPreIncidentTranscript } from "../database/queries/index.ts";
import { getFacility, getPharmacies, getPharmacy, neighborhoodOf, type Facility, type Pharmacy } from "../database/seed/index.ts";
import { describeOption, viableOptions, type ApprovalOption } from "../services/approval.ts";
import { demo } from "../services/demo.ts";

// Type resolvers: database rows / seed records -> GraphQL shapes.

export const labelsOf = (l: JevLabels | null | undefined) =>
  Object.entries(l ?? {}).map(([label, confidence]) => ({ label, confidence: Number(confidence) }));

const toRad = (d: number) => (d * Math.PI) / 180;
export function straightKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const h = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

const auditOf = <T>(incidentId: string, type: string) =>
  listAudit(incidentId, [type]).map((e) => ({ ...e, payload: e.payload as T }));

const incidentFacility = (r: FacilityResponse) => ({ ...r, facility: getFacility(r.facilityId) });
const recommendation = (o: ApprovalOption) => ({
  rank: o.rank,
  status: o.status,
  summary: describeOption(o),
  facility: o.facility,
  response: incidentFacility(o.response),
});

export const toAuditEntry = (e: { id: number; incidentId: string | null; eventType: string; payload: unknown; createdAt: string }) =>
  ({ id: e.id, type: e.eventType, incidentId: e.incidentId, at: e.createdAt, payload: e.payload });

export const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  serialize: (v) => v,
  parseValue: (v) => v,
});

export const typeResolvers = {
  JSON: JSONScalar,
  StorageType: { ultra_cold: "ultra-cold" },

  Pharmacy: {
    neighborhood: (p: Pharmacy) => neighborhoodOf(p),
    staffName: (p: Pharmacy) => p.responsibleStaff.name,
  },

  Facility: {
    neighborhood: (f: Facility) => neighborhoodOf(f),
    capacity: (f: Facility) => ({
      refrigerated: f.capacityUnits.refrigerated ?? 0,
      frozen: f.capacityUnits.frozen ?? 0,
      ultraCold: f.capacityUnits["ultra-cold"] ?? 0,
    }),
    // Every seed site backs up the one synthetic pharmacy; measure from it.
    straightKm: (f: Facility) => straightKm(getPharmacies()[0] ?? f, f),
  },

  IncidentFacility: {
    labels: (r: FacilityResponse) => labelsOf(r.jevLabels),
    confidence: (r: FacilityResponse) => r.jevLabels?.answer_confidence ?? null,
    answers: (r: FacilityResponse) =>
      auditOf<{ facilityId: string; response: FacilityResponse; labels: JevLabels }>(r.incidentId, "response.judged")
        .filter((e) => e.payload.facilityId === r.facilityId)
        .map((e) => ({
          at: e.createdAt,
          status: e.payload.response.status,
          text: e.payload.response.rawText,
          labels: labelsOf(e.payload.labels),
          reportedCapacity: e.payload.response.reportedCapacity,
          receivingUntil: e.payload.response.receivingUntil,
          conditions: e.payload.response.conditions,
        })),
  },

  Decision: {
    facility: (d: { facilityId: string }) => getFacility(d.facilityId) ?? null,
  },

  Incident: {
    code: (i: Incident) => incidentCode(i.id),
    pharmacy: (i: Incident) => getPharmacy(i.pharmacyId),
    triage: (i: Incident) => labelsOf(i.triage),
    redTeam: (i: Incident) => demo.redTeamIncidentIds.has(i.id),
    facilities: (i: Incident) =>
      listFacilityResponses(i.id).map(incidentFacility).filter((r) => r.facility)
        .sort((a, b) => (a.driveMinutes ?? Infinity) - (b.driveMinutes ?? Infinity)),
    options: (i: Incident) => viableOptions(i.id).map(recommendation),
    recommendation: (i: Incident) => {
      const [top] = viableOptions(i.id);
      return top ? recommendation(top) : null;
    },
    decisions: (i: Incident) => listDecisions(i.id),
    // The pharmacy's own intake call comes first (spoken before the incident existed), then the rest.
    transcript: (i: Incident) =>
      [...listPreIncidentTranscript(i.id), ...listAudit(i.id, ["transcript.line"])]
        .map((e) => ({ at: e.createdAt, ...(e.payload as { facilityId?: string; caller: string; speaker: string; text: string }) })),
    alerts: (i: Incident) =>
      auditOf<Record<string, unknown>>(i.id, "alert.sent").map((e) => ({ id: e.id, at: e.createdAt, ...e.payload })),
    audit: (i: Incident, { limit }: { limit?: number }) =>
      listAudit(i.id).slice(-(limit ?? 200)).map(toAuditEntry),
  },
};

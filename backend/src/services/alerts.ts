import { maskPhone, sendSms } from "../application/guava/sms.ts";
import { incidentCode, listFacilityResponses } from "../database/queries/index.ts";
import { getFacility, getPharmacy } from "../database/seed/index.ts";
import { env } from "../utils/env.ts";
import { bus, type EventMap } from "../utils/events.ts";

// SMS alerts (inbound-only system: texts just ask people to call the Coldline line).
//   matching done   -> text each matched facility coordinator
//   recommendation  -> text the pharmacy's responsible staff with a link to the approval view
// Every attempt publishes alert.sent ("sent" | "simulated" | "failed") for the dashboard pager.

const LINE = "+1 240-369-1080";
const dashboardUrl = () => (env("COLDLINE_DASHBOARD_URL") ?? "http://localhost:5173").replace(/\/$/, "");

type Alert = Omit<EventMap["alert.sent"], "status" | "detail" | "to"> & { to: string | undefined };

async function alert(a: Alert) {
  const outcome = await sendSms(a.to, a.message);
  bus.publish("alert.sent", {
    ...a,
    to: maskPhone(a.to),
    status: outcome.status,
    detail: "detail" in outcome ? outcome.detail : undefined,
  });
}

export function startAlerts(): () => void {
  const notified = new Set<string>();
  return bus.on("incident.updated", ({ payload: { incident } }) => {
    const key = `${incident.id}:${incident.status}`;
    if (notified.has(key)) return;
    if (incident.status === "awaiting_responses") {
      notified.add(key);
      for (const r of listFacilityResponses(incident.id)) {
        const facility = getFacility(r.facilityId);
        if (!facility) continue;
        void alert({
          incidentId: incident.id,
          kind: "coordinator_request",
          recipient: facility.name,
          facilityId: facility.id,
          to: env(facility.phoneEnv),
          message: `Coldline: cold-storage request near you. Call ${LINE} to respond.`,
        });
      }
    }
    if (incident.status === "recommended") {
      notified.add(key);
      const staff = getPharmacy(incident.pharmacyId)?.responsibleStaff;
      void alert({
        incidentId: incident.id,
        kind: "staff_recommendation",
        recipient: staff?.name ?? "Coldline staff",
        to: env(staff?.phoneEnv ?? "STAFF_PHONE"),
        message: `Coldline ${incidentCode(incident.id)}: a backup site is ready for your approval. ` +
          `Review: ${dashboardUrl()}/incidents/${incident.id}#approve`,
      });
    }
  });
}

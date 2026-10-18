import { jevJudge } from "../application/typesafe/jev.ts";
import { getIncident, listActiveIncidents, listFacilityResponses, listIncidents } from "../database/queries/index.ts";
import { getPharmacies } from "../database/seed/index.ts";
import { clockNow, setClock } from "../utils/clock.ts";
import { bus } from "../utils/events.ts";
import {
  coordinatorPersonas, runRedTeam, simulateResponders, type Persona,
} from "../../agents/simulator.ts";
import { localMinutes } from "./coordinator.ts";
import { changeIncidentStatus } from "./incidents.ts";
import { submitIntake, type IntakeInput } from "./intake.ts";

// Dashboard demo controls. Everything goes through the same paths as real calls:
// intake for new requests, the Phase 3 personas (agent.test) for responders.

export interface DemoState {
  simulating: boolean;
  redteam: boolean;
  /** Incidents opened by the red team; the dashboard never treats them as the active request. */
  redTeamIncidentIds: Set<string>;
  lastError: string | null;
}

export const demo: DemoState = { simulating: false, redteam: false, redTeamIncidentIds: new Set(), lastError: null };

const DEFAULT_REQUEST: Omit<IntakeInput, "pharmacyId"> = {
  product: "Influenza vaccine (synthetic)",
  units: 120,
  reportedStorage: "refrigerated",
  currentTemp: "9.4 C and climbing",
  minutesSinceFailure: 25,
};

/** Open an incident exactly as pharmacy intake does (Jev triage -> matcher -> responses). */
export async function openDemoIncident(input: Partial<IntakeInput> = {}) {
  const { incident } = await submitIntake({
    pharmacyId: getPharmacies()[0].id,
    ...DEFAULT_REQUEST,
    ...Object.fromEntries(Object.entries(input).filter(([, v]) => v != null)),
  }, jevJudge);
  return incident;
}

/** Two pm Pacific, like `npm run simulate`, so receiving cutoffs judge the same whenever the demo runs. */
export function setDemoClock() {
  const now = new Date();
  setClock(new Date(now.getTime() + (14 * 60 - localMinutes(now)) * 60_000));
}

const lineOf = (persona: Persona, incidentId: string | null, line: string) => {
  const m = line.match(/^\[(\w+)\]\s+(.*)$/s);
  if (!m) return;
  bus.publish("transcript.line", {
    incidentId,
    facilityId: persona.facilityId,
    caller: persona.key,
    speaker: m[1] === "agent" ? "agent" : "caller",
    text: m[2].trim(),
  });
};

/**
 * Start staff1-3 (and optionally the red team, afterwards, on its own incident) in the background.
 * Returns at once; progress arrives over the event bus.
 */
export function startSimulation(opts: { incidentId?: string; redteam?: boolean; realClock?: boolean }) {
  if (demo.simulating) throw new Error("A simulation is already running.");
  const incidentId = opts.incidentId ?? currentIncidentId();
  if (!incidentId) throw new Error("No open request. Start a new request first.");
  const incident = getIncident(incidentId);
  if (!incident || ["approved", "rejected", "closed"].includes(incident.status)) {
    throw new Error("This request is already decided. Start a new request first.");
  }
  // Only coordinators of sites the matcher actually picked have a request to answer.
  const matched = new Set(listFacilityResponses(incidentId).map((r) => r.facilityId));
  const personas = coordinatorPersonas.filter((p) => !!p.facilityId && matched.has(p.facilityId));
  if (!personas.length) {
    throw new Error(
      matched.size
        ? "None of the simulated coordinators' sites were matched for this request."
        : `No backup site can hold ${incident.totalUnits.toLocaleString("en-US")} ${incident.storageType} units, ` +
          "so there is no coordinator to simulate. Try a request under 400 doses.",
    );
  }
  if (!opts.realClock) setDemoClock();
  demo.simulating = true;
  demo.redteam = !!opts.redteam;
  demo.lastError = null;
  bus.publish("demo.status", { incidentId, simulating: true, redteam: demo.redteam, error: null });

  void (async () => {
    try {
      await simulateResponders({
        incidentId,
        personas,
        log: (persona, line) => lineOf(persona, incidentId, line),
      });
      if (opts.redteam) {
        let rtIncident: string | null = null;
        const off = bus.on("incident.opened", (e) => {
          rtIncident = e.payload.incident.id;
          demo.redTeamIncidentIds.add(rtIncident);
        });
        try {
          await runRedTeam((line) => {
            off(); // only the red team's own incident is opened inside runRedTeam
            lineOf({ key: "redteam", facilityId: "glendale-depot" } as Persona, rtIncident, line);
          });
        } finally {
          off();
        }
      }
    } catch (err) {
      demo.lastError = err instanceof Error ? err.message : String(err);
      console.error("[demo] simulation failed:", err);
    } finally {
      demo.simulating = false;
      demo.redteam = false;
      bus.publish("demo.status", { incidentId, simulating: false, redteam: false, error: demo.lastError });
    }
  })();
}

/** Close every incident that is not closed yet (audited). Nothing is deleted. */
export function resetDemo() {
  if (demo.simulating) throw new Error("Wait for the running simulation to finish.");
  for (const incident of listIncidents()) if (incident.status !== "closed") changeIncidentStatus(incident.id, "closed");
  setClock(null);
  return true;
}

/** Newest active incident that is not a red-team test. */
export function currentIncidentId(): string | undefined {
  return listActiveIncidents().find((i) => !demo.redTeamIncidentIds.has(i.id))?.id;
}

export const businessClock = () =>
  clockNow().toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });

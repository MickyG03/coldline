import { getIncident } from "../database/queries/index.ts";
import { badInput, notFound } from "../middleware/index.ts";
import { recordStaffDecision, viableOptions } from "../services/approval.ts";
import { openDemoIncident, resetDemo, startSimulation } from "../services/demo.ts";
import type { IntakeInput } from "../services/intake.ts";
import { demoStatus } from "./query.ts";

/** Run a service call; its thrown message becomes a client-facing BAD_USER_INPUT error. */
function asInput<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    return badInput((err as Error).message);
  }
}

export const Mutation = {
  decide: (_: unknown, args: {
    incidentId: string; action: "approve" | "reject"; facilityId?: string | null; decidedBy: string; reason?: string | null;
  }) => {
    const incident = getIncident(args.incidentId) ?? notFound("incident", args.incidentId);
    if (!args.decidedBy.trim()) badInput("decidedBy is required: every decision names a person.");
    let options = viableOptions(incident.id);
    if (args.facilityId) {
      // A specific listed option: put it first, since recordStaffDecision acts on options[0].
      const picked = options.find((o) => o.facility.id === args.facilityId)
        ?? badInput("That facility is not a confirmed or conditional option for this request.");
      options = [picked, ...options.filter((o) => o !== picked)];
    }
    const outcome = recordStaffDecision({
      incident,
      options,
      choice: args.action,
      decidedBy: `${args.decidedBy.trim()} (staff, dashboard)`,
      reason: args.reason?.trim() || null,
    });
    if (!outcome.decision) badInput(outcome.message);
    return { message: outcome.message, decision: outcome.decision, incident: getIncident(incident.id) };
  },

  simulateResponders: (_: unknown, args: { incidentId?: string | null; redteam?: boolean | null; realClock?: boolean | null }) => {
    asInput(() => startSimulation({ incidentId: args.incidentId ?? undefined, redteam: !!args.redteam, realClock: !!args.realClock }));
    return demoStatus();
  },

  resetDemo: () => asInput(resetDemo),

  openDemoIncident: (_: unknown, { input }: { input?: Partial<IntakeInput> | null }) => openDemoIncident(input ?? {}),
};

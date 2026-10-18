import { bus, type EventType } from "../utils/events.ts";

// Event bus -> GraphQL subscription (served over SSE by graphql-yoga). The request's abort
// signal ends the bus iterator when the client disconnects.

export const Subscription = {
  events: {
    subscribe: async function* (_: unknown, args: { incidentId?: string | null; types?: string[] | null }, ctx: { request: Request }) {
      for await (const e of bus.subscribe((args.types ?? undefined) as EventType[] | undefined, ctx.request.signal)) {
        if (args.incidentId && e.incidentId && e.incidentId !== args.incidentId) continue;
        yield { events: e };
      }
    },
  },
};

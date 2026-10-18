import { EventEmitter } from "node:events";
import { insertAudit } from "../database/queries/index.ts";
import type {
  Decision, FacilityResponse, FacilityResponseStatus, Incident, JevLabels,
} from "../database/models/index.ts";

// Typed in-process event bus. Every publish writes one audit_log row first, then
// notifies subscribers. Payloads are plain JSON so they can go straight out over
// GraphQL subscriptions (`subscribe` yields an async iterator for that).

export interface EventMap {
  "incident.opened": { incident: Incident };
  "incident.updated": { incident: Incident; changes: string[] };
  "call.started": { incidentId: string; facilityId: string; callId?: string; direction: "inbound" | "outbound" };
  "response.judged": { incidentId: string; facilityId: string; response: FacilityResponse; labels: JevLabels };
  "facility.status_changed": {
    incidentId: string;
    facilityId: string;
    from: FacilityResponseStatus | null;
    to: FacilityResponseStatus;
  };
  "decision.made": { decision: Decision };
  /** Inbound call identified by caller ID (or a chat-mode override). incidentId is null until known. */
  "caller.routed": { incidentId: string | null; callId: string; role: string; facilityId?: string; via: "caller_id" | "override" };
  "caller.refused": { incidentId: null; callId: string; fromNumber: string | null; reason: string };
}

export type EventType = keyof EventMap;

export interface BusEvent<K extends EventType = EventType> {
  type: K;
  incidentId: string | null;
  auditId: number;
  at: string;
  payload: EventMap[K];
}

function incidentIdOf(payload: EventMap[EventType]): string | null {
  if ("incident" in payload) return payload.incident.id;
  if ("decision" in payload) return payload.decision.incidentId;
  return payload.incidentId;
}

class EventBus {
  private emitter = new EventEmitter().setMaxListeners(0);

  publish<K extends EventType>(type: K, payload: EventMap[K]): BusEvent<K> {
    const incidentId = incidentIdOf(payload);
    const audit = insertAudit(incidentId, type, payload);
    const event: BusEvent<K> = { type, incidentId, auditId: audit.id, at: audit.createdAt, payload };
    this.emitter.emit(type, event);
    this.emitter.emit("*", event);
    return event;
  }

  on<K extends EventType>(type: K, fn: (e: BusEvent<K>) => void): () => void {
    this.emitter.on(type, fn);
    return () => this.emitter.off(type, fn);
  }

  onAny(fn: (e: BusEvent) => void): () => void {
    this.emitter.on("*", fn);
    return () => this.emitter.off("*", fn);
  }

  /** Async iterator over events (all, or only `types`) — plugs into GraphQL subscriptions. */
  async *subscribe(types?: EventType[], signal?: AbortSignal): AsyncGenerator<BusEvent> {
    const queue: BusEvent[] = [];
    let wake: (() => void) | undefined;
    const off = this.onAny((e) => {
      if (types && !types.includes(e.type)) return;
      queue.push(e);
      wake?.();
    });
    const onAbort = () => wake?.();
    signal?.addEventListener("abort", onAbort);
    try {
      while (!signal?.aborted) {
        if (queue.length) yield queue.shift()!;
        else await new Promise<void>((resolve) => (wake = resolve));
      }
    } finally {
      off();
      signal?.removeEventListener("abort", onAbort);
    }
  }
}

export const bus = new EventBus();

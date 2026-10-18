import type { BusEvent } from "../connection/index.ts";

// Calls in progress, folded from the event stream (caller.routed -> transcript.line -> call.ended).
// Real phone calls tag their lines with a callId; simulated responders (agent.test) don't, so their
// lines are matched to the open call for the same facility.

export interface LiveCallLine {
  speaker: "agent" | "caller";
  text: string;
  at: string;
}

export interface LiveCall {
  callId: string;
  role: string;
  label: string;
  facilityId?: string;
  startedAt: string;
  endedAt?: string;
  lines: LiveCallLine[];
}

/** How long an ended call stays on screen. */
export const ENDED_CALL_LINGER_MS = 12_000;

function targetCall(calls: LiveCall[], p: Record<string, any>): string | undefined {
  if (p.callId) return p.callId;
  if (!p.facilityId) return undefined;
  return calls.filter((c) => !c.endedAt && c.facilityId === p.facilityId).at(-1)?.callId;
}

export function foldCallEvent(calls: LiveCall[], e: BusEvent): LiveCall[] {
  const p = e.payload as Record<string, any>;
  switch (e.type) {
    case "caller.routed":
      if (calls.some((c) => c.callId === p.callId)) return calls;
      return [...calls, {
        callId: p.callId, role: p.role, label: p.label ?? p.role, facilityId: p.facilityId, startedAt: e.at, lines: [],
      }];
    case "transcript.line": {
      const line = { speaker: p.speaker, text: p.text, at: e.at };
      const id = targetCall(calls, p);
      if (id && calls.some((c) => c.callId === id)) {
        return calls.map((c) => (c.callId === id ? { ...c, lines: [...c.lines, line] } : c));
      }
      // Real call joined mid-way (page opened after it started).
      if (p.callId) return [...calls, { callId: p.callId, role: p.caller, label: p.caller, startedAt: e.at, lines: [line] }];
      return calls;
    }
    case "call.ended":
      return calls.map((c) => (c.callId === p.callId ? { ...c, endedAt: e.at } : c));
    default:
      return calls;
  }
}

export const dropStaleCalls = (calls: LiveCall[], now = Date.now()) =>
  calls.filter((c) => !c.endedAt || now - new Date(c.endedAt).getTime() < ENDED_CALL_LINGER_MS);

/** Mark every call still open as ended now (the backend dropped, so they can't still be live). */
export const endOpenCalls = (calls: LiveCall[]) => {
  const at = new Date().toISOString();
  return calls.map((c) => (c.endedAt ? c : { ...c, endedAt: at }));
};

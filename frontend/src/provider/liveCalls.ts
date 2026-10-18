import type { BusEvent } from "../connection/index.ts";

// Real phone calls in progress, folded from the event stream (caller.routed -> transcript.line
// with a callId -> call.ended). Simulated callers carry no callId and stay out of this.

export interface LiveCallLine {
  speaker: "agent" | "caller";
  text: string;
  at: string;
}

export interface LiveCall {
  callId: string;
  role: string;
  label: string;
  startedAt: string;
  endedAt?: string;
  lines: LiveCallLine[];
}

/** How long an ended call stays on screen. */
export const ENDED_CALL_LINGER_MS = 20_000;

export function foldCallEvent(calls: LiveCall[], e: BusEvent): LiveCall[] {
  const p = e.payload as Record<string, any>;
  switch (e.type) {
    case "caller.routed":
      if (calls.some((c) => c.callId === p.callId)) return calls;
      return [...calls, { callId: p.callId, role: p.role, label: p.label ?? p.role, startedAt: e.at, lines: [] }];
    case "transcript.line": {
      if (!p.callId) return calls;
      const line = { speaker: p.speaker, text: p.text, at: e.at };
      if (!calls.some((c) => c.callId === p.callId)) {
        // Joined mid-call (page opened after the call started).
        return [...calls, { callId: p.callId, role: p.caller, label: p.caller, startedAt: e.at, lines: [line] }];
      }
      return calls.map((c) => (c.callId === p.callId ? { ...c, lines: [...c.lines, line] } : c));
    }
    case "call.ended":
      return calls.map((c) => (c.callId === p.callId ? { ...c, endedAt: e.at } : c));
    default:
      return calls;
  }
}

export const dropStaleCalls = (calls: LiveCall[], now = Date.now()) =>
  calls.filter((c) => !c.endedAt || now - new Date(c.endedAt).getTime() < ENDED_CALL_LINGER_MS);

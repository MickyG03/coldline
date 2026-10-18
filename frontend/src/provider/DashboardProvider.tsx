import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DASHBOARD, DECIDE, EVENTS, OPEN_DEMO_INCIDENT, RESET, ROUTE, SIMULATE, request, subscribe,
  type BusEvent, type DemoStatus, type Incident, type Network, type Route,
} from "../connection/index.ts";
import { dropStaleCalls, endOpenCalls, foldCallEvent, type LiveCall } from "./liveCalls.ts";

// Dashboard data: one query for everything on screen, refetched (debounced) whenever the
// backend event bus publishes something. Actions are thin wrappers over the mutations.

interface DashboardData {
  network: Network;
  incident: Incident | null;
  demo: DemoStatus;
}

interface DashboardContextValue {
  data: DashboardData | null;
  error: string | null;
  live: boolean;
  events: BusEvent[];
  /** Real phone calls in progress (and ones that just ended). */
  calls: LiveCall[];
  busy: string | null;
  selectedId: string | null;
  select: (facilityId: string | null) => void;
  route: Route | null;
  newRequest: () => Promise<void>;
  simulate: (redteam: boolean) => Promise<void>;
  reset: () => Promise<void>;
  decide: (action: "approve" | "reject", facilityId?: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export const DECIDED_BY = "MG";

export function DashboardProvider({ incidentId, children }: { incidentId?: string; children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [calls, setCalls] = useState<LiveCall[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, select] = useState<string | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const wasDown = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await request<{ network: Network; currentIncident?: Incident | null; incident?: Incident | null; demo: DemoStatus }>(
        DASHBOARD, { incidentId: incidentId ?? "", byId: !!incidentId },
      );
      setData({ network: res.network, incident: (incidentId ? res.incident : res.currentIncident) ?? null, demo: res.demo });
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [incidentId]);

  const refresh = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(load, 200);
  }, [load]);

  useEffect(() => {
    void load();
    return subscribe<{ events: BusEvent }>(EVENTS, {}, ({ events: e }) => {
      setCalls((prev) => foldCallEvent(prev, e));
      // A real call's turn before its request exists has nothing to refetch; it shows from `calls`.
      if (e.type === "transcript.line" && (e.payload as { callId?: string }).callId && !e.incidentId) return;
      setEvents((prev) => [e, ...prev].slice(0, 60));
      refresh();
    }, (ok) => {
      setLive(ok);
      if (!ok) wasDown.current = true;
      if (ok) {
        // Back after a drop (e.g. the backend restarted): nothing that was on the line survived it.
        if (wasDown.current) setCalls((prev) => endOpenCalls(prev));
        wasDown.current = false;
        refresh();
      }
    });
  }, [load, refresh]);

  // Ended calls linger briefly, then drop off.
  useEffect(() => {
    if (!calls.some((c) => c.endedAt)) return;
    const id = window.setInterval(() => setCalls((prev) => dropStaleCalls(prev)), 2000);
    return () => window.clearInterval(id);
  }, [calls]);

  // Follow the recommendation unless the user picked a site; drop a selection that left the incident.
  const incident = data?.incident ?? null;
  // Once a site is approved, the map follows it (the courier drives there); before that, the recommendation.
  const approvedId = incident?.decisions.find((d) => d.decision === "approved")?.facility?.id ?? null;
  const focusId = selectedId ?? approvedId ?? incident?.recommendation?.facility.id ?? null;
  useEffect(() => {
    if (!incident || !focusId) {
      setRoute(null);
      return;
    }
    let stale = false;
    request<{ route: Route | null }>(ROUTE, { incidentId: incident.id, facilityId: focusId })
      .then((r) => !stale && setRoute(r.route))
      .catch(() => !stale && setRoute(null));
    return () => { stale = true; };
  }, [incident?.id, focusId]);

  const run = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
      void load();
    }
  }, [load]);

  const value = useMemo<DashboardContextValue>(() => ({
    data, error, live, events, calls, busy,
    route: route?.facilityId === focusId ? route : null,
    selectedId: focusId,
    select,
    newRequest: () => run("new", async () => {
      select(null);
      await request(OPEN_DEMO_INCIDENT);
    }),
    simulate: (redteam) => run("simulate", () => request(SIMULATE, { incidentId: incident?.id, redteam })),
    reset: () => run("reset", async () => {
      select(null);
      await request(RESET);
    }),
    decide: (action, facilityId) => run(action, () => {
      if (!incident) throw new Error("No request to decide on.");
      return request(DECIDE, { incidentId: incident.id, action, facilityId, decidedBy: DECIDED_BY });
    }),
  }), [data, error, live, events, calls, busy, route, focusId, run, incident?.id]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return ctx;
}

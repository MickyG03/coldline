import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DASHBOARD, DECIDE, EVENTS, OPEN_DEMO_INCIDENT, RESET, ROUTE, SIMULATE, request, subscribe,
  type BusEvent, type DemoStatus, type Incident, type Network, type Route,
} from "../connection/index.ts";

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
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, select] = useState<string | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const timer = useRef<number | undefined>(undefined);

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
      setEvents((prev) => [e, ...prev].slice(0, 60));
      refresh();
    }, (ok) => {
      setLive(ok);
      if (ok) refresh();
    });
  }, [load, refresh]);

  // Follow the recommendation unless the user picked a site; drop a selection that left the incident.
  const incident = data?.incident ?? null;
  const focusId = selectedId ?? incident?.recommendation?.facility.id ?? null;
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
    data, error, live, events, busy,
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
  }), [data, error, live, events, busy, route, focusId, run, incident?.id]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return ctx;
}

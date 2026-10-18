import { useEffect, useState } from "react";

// Simulated cold-chain courier for the approved handoff. Nothing is dispatched for real: the van
// replays the Google Routes path, compressed so a demo audience sees the whole trip.

/** Wall-clock length of the animated trip, whatever the real drive time. */
export const DEMO_TRIP_MS = 45_000;

export interface CourierState {
  position: google.maps.LatLngLiteral;
  progress: number; // 0..1
  etaMinutes: number; // real-world minutes left, scaled from the route duration
  delivered: boolean;
}

/** Point at fraction t (0..1) of the path's length (planar approximation, fine at city scale). */
export function pointAlong(path: google.maps.LatLngLiteral[], t: number): google.maps.LatLngLiteral {
  if (path.length < 2) return path[0];
  const seg = path.slice(1).map((p, i) => Math.hypot(p.lat - path[i].lat, p.lng - path[i].lng));
  let target = seg.reduce((a, b) => a + b, 0) * Math.min(1, Math.max(0, t));
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const f = seg[i] ? Math.min(1, target / seg[i]) : 1;
      const a = path[i], b = path[i + 1];
      return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
    }
    target -= seg[i];
  }
  return path[path.length - 1];
}

/** Courier position, ticking ~5x a second until delivered. Null when there is no approved trip. */
export function useCourier(path: google.maps.LatLngLiteral[] | null, startedAt: string | null, durationMinutes: number) {
  const [now, setNow] = useState(Date.now());
  const start = startedAt ? new Date(startedAt).getTime() : null;
  const running = !!path && start != null && now - start < DEMO_TRIP_MS;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [running]);

  if (!path?.length || start == null) return null;
  const progress = Math.min(1, Math.max(0, (now - start) / DEMO_TRIP_MS));
  return {
    position: pointAlong(path, progress),
    progress,
    etaMinutes: Math.ceil(durationMinutes * (1 - progress)),
    delivered: progress >= 1,
  } satisfies CourierState;
}

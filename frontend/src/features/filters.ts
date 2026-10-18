import { useMemo, useState } from "react";
import type { Facility, FacilityStatus, Incident } from "../connection/index.ts";
import { miles } from "./status.ts";

// Search / "Available now" / radius filters shared by the map and the "Within reach" list.

export interface FacilityView {
  facility: Facility;
  /** Status for the current request; null = not matched to it (or no request open). */
  status: FacilityStatus | null;
  response: Incident["facilities"][number] | null;
  /** Drive distance when matched, else straight-line. */
  km: number;
}

export const RADII = [5, 10, 20, 50] as const;

export function useFilters() {
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [radius, setRadius] = useState<number>(20);
  return { query, setQuery, availableOnly, setAvailableOnly, radius, setRadius };
}
export type Filters = ReturnType<typeof useFilters>;

export function useFacilityViews(facilities: Facility[], incident: Incident | null, f: Filters): FacilityView[] {
  return useMemo(() => {
    const byId = new Map(incident?.facilities.map((r) => [r.facility.id, r]) ?? []);
    const q = f.query.trim().toLowerCase();
    return facilities
      .map((facility) => {
        const response = byId.get(facility.id) ?? null;
        return { facility, response, status: response?.status ?? null, km: response?.driveKm ?? facility.straightKm };
      })
      .filter((v) => !q || `${v.facility.name} ${v.facility.neighborhood}`.toLowerCase().includes(q))
      .filter((v) => !f.availableOnly || v.status === "confirmed" || v.status === "conditional")
      .filter((v) => (miles(v.facility.straightKm) ?? 0) <= f.radius);
  }, [facilities, incident, f.query, f.availableOnly, f.radius]);
}

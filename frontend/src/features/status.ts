import type { FacilityStatus, IncidentFacility } from "../connection/index.ts";

// Plain-language status lines shared by the map, the list and the evidence panel.

export const STATUS_LABEL: Record<FacilityStatus, string> = {
  unknown: "Not yet verified",
  calling: "On the line now",
  confirmed: "Confirmed",
  conditional: "Conditional",
  unavailable: "Can't receive",
  contradictory: "Contradictory answer",
  incomplete: "Needs confirmation",
};

/** First stated condition, without the rule-engine reasons appended after " | ". */
export const firstCondition = (c: string | null) => c?.split(" | ")[0]?.trim() || null;

export function statusLine(r: Pick<IncidentFacility, "status" | "reportedCapacity" | "conditions">): string {
  if (r.status === "confirmed" && r.reportedCapacity != null) return `${r.reportedCapacity} doses available`;
  if (r.status === "conditional") {
    const c = firstCondition(r.conditions);
    return c ? `Conditional: ${c}` : "Conditional";
  }
  return STATUS_LABEL[r.status];
}

export const KM_PER_MI = 1.609;
export const miles = (km: number | null | undefined) => (km == null ? null : km / KM_PER_MI);
export const fmtMiles = (km: number | null | undefined) => {
  const mi = miles(km);
  return mi == null ? "—" : `${mi.toFixed(1)} mi`;
};

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

export const pct = (v: number) => `${Math.round(v * 100)}%`;

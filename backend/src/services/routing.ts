import { getFacilities, getFacility, getPharmacies, getPharmacy } from "../database/seed/index.ts";
import { env, isPhone } from "../utils/env.ts";

// Caller-ID routing: who is on the line? Phone numbers come from the env vars the seed
// files name (pharmacies.json / facilities.json phoneEnv, STAFF_PHONE).

export type CallerRole =
  | { role: "pharmacy"; pharmacyId: string }
  | { role: "coordinator"; facilityId: string }
  | { role: "staff"; pharmacyId: string }
  | { role: "unknown" };

const digits = (n: string) => n.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

/** Resolve a caller number to a role. Unset/placeholder env numbers never match. */
export function resolveCaller(fromNumber: string | null | undefined): CallerRole {
  if (!fromNumber || !digits(fromNumber)) return { role: "unknown" };
  const same = (envName: string) => {
    const v = env(envName);
    return isPhone(v) && digits(v!) === digits(fromNumber);
  };
  for (const p of getPharmacies()) if (same(p.phoneEnv)) return { role: "pharmacy", pharmacyId: p.id };
  for (const f of getFacilities()) if (same(f.phoneEnv)) return { role: "coordinator", facilityId: f.id };
  for (const p of getPharmacies()) if (same(p.responsibleStaff.phoneEnv)) return { role: "staff", pharmacyId: p.id };
  return { role: "unknown" };
}

/**
 * Parse a test-mode override: "pharmacy", "pharmacy:<id>", "staff", "facility:<id>"
 * (also "coordinator:<id>", or "facility:a|b|c"). Only honored when there is no caller ID.
 */
export function parseRoleOverride(value: unknown): CallerRole {
  if (typeof value !== "string" || !value.trim()) return { role: "unknown" };
  const [kind, idRaw] = value.trim().toLowerCase().split(":");
  const firstPharmacy = getPharmacies()[0]?.id;
  if (kind === "pharmacy" || kind === "staff") {
    const pharmacyId = idRaw ?? firstPharmacy;
    if (!pharmacyId || !getPharmacy(pharmacyId)) return { role: "unknown" };
    return { role: kind, pharmacyId };
  }
  if (kind === "facility" || kind === "coordinator") {
    const letter = ["a", "b", "c"].indexOf(idRaw ?? "");
    const facility = letter >= 0 ? getFacilities()[letter] : getFacility(idRaw ?? "");
    return facility ? { role: "coordinator", facilityId: facility.id } : { role: "unknown" };
  }
  return { role: "unknown" };
}

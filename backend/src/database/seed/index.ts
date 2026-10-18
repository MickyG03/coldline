import { readFileSync } from "node:fs";

// Synthetic reference data, loaded from the JSON files next to this module.

export interface Pharmacy {
  id: string;
  name: string;
  synthetic: boolean;
  address: string;
  lat: number;
  lng: number;
  phoneEnv: string;
  responsibleStaff: { name: string; phoneEnv: string };
  backupFacilityIds: string[];
}

export interface Facility {
  id: string;
  name: string;
  synthetic: boolean;
  address: string;
  lat: number;
  lng: number;
  coordinator: string;
  phoneEnv: string;
  capacityUnits: { refrigerated: number; frozen: number; "ultra-cold"?: number };
  receivingHours: string;
}

const load = <T>(file: string): T[] =>
  JSON.parse(readFileSync(new URL(file, import.meta.url), "utf-8"));

let pharmacies: Pharmacy[] | undefined;
let facilities: Facility[] | undefined;

export const getPharmacies = () => (pharmacies ??= load<Pharmacy>("./pharmacies.json"));
export const getFacilities = () => (facilities ??= load<Facility>("./facilities.json"));
export const getPharmacy = (id: string) => getPharmacies().find((p) => p.id === id);
export const getFacility = (id: string) => getFacilities().find((f) => f.id === id);

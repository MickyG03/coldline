/**
 * pharmacy: simulated pharmacist reporting a fridge failure (synthetic, inventory only).
 * Opens an incident through the real intake call flow via agent.test().
 */

import type { Persona } from "../simulator.ts";

export const persona: Persona = {
  key: "pharmacy",
  name: "Pharmacist, Eastside Community Pharmacy",
  roleOverride: "pharmacy:eastside-rx",
  script:
    "You are the pharmacist on duty at Eastside Community Pharmacy, and yes, this is Eastside Community Pharmacy. " +
    "Your vaccine fridge's compressor died about 25 minutes ago. At risk: 180 doses of influenza vaccine. It is " +
    "labeled refrigerated, 2 to 8 Celsius. The fridge reads 9.4 degrees Celsius and climbing. Never share any " +
    "patient information.",
};

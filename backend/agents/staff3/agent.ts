/**
 * staff3: simulated coordinator for glendale-depot (synthetic).
 * Plays the facility side of a Coldline call against the inbound agent via agent.test().
 */

import type { Persona } from "../simulator.ts";

export const persona: Persona = {
  key: "staff3",
  name: "Priya, Glendale Community Vaccine Depot",
  roleOverride: "facility:glendale-depot",
  facilityId: "glendale-depot",
  script:
    "You are Priya, the on-call coordinator at Glendale Community Vaccine Depot. You can take all of it: you have " +
    "about 800 refrigerated spaces and the dock receives 24 hours. One condition: whoever dispatches the truck must " +
    "call you before it leaves so you can have someone meet it at the dock. Insist on that call before dispatch.",
  expect: ["conditional", "confirmed"],
  requireCondition: true,
};

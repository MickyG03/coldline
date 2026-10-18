/**
 * staff2: simulated coordinator for westlake-health (synthetic).
 * Plays the facility side of a Coldline call against the inbound agent via agent.test().
 */

import type { Persona } from "../simulator.ts";

export const persona: Persona = {
  key: "staff2",
  name: "Marcus, Westlake Health Center",
  roleOverride: "facility:westlake-health",
  facilityId: "westlake-health",
  script:
    "You are Marcus, the pharmacy lead at Westlake Health Center. Your backup vaccine fridge is already full: you " +
    "took another clinic's overflow this morning. You can take zero units today. Be apologetic but firm and do not " +
    "offer partial space. If asked about receiving hours, say you normally receive until 10 pm but it does not " +
    "matter today because there is no room.",
  expect: ["unavailable"],
};

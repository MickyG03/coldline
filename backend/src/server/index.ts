/**
 * Coldline backend entry point: one process runs the GraphQL API (dashboard), the SMS alerts
 * and the Guava voice agent on the inbound number.
 *
 *   npm start                     API + phone (caller ID picks the role)
 *   npm start -- --no-phone       API only (dashboard + simulated responders)
 *   npm run chat -- --as <role>   API + text chat; role = pharmacy | staff | facility:<id or a|b|c>
 */

import { env } from "../utils/env.ts";
import { agent } from "../../agents/inbound/agent.ts";
import { startAlerts } from "../services/alerts.ts";
import { startGraphQL } from "./graphql.ts";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i < 0) return undefined;
  return args[i].includes("=") ? args[i].split("=")[1] : args[i + 1];
};

const api = await startGraphQL();
if (api) startAlerts(); // alerts belong to the process that serves the dashboard

if (args.includes("--chat")) {
  const roleOverride = flag("--as") ?? env("COLDLINE_AS") ?? "pharmacy";
  console.log(`Chat mode as: ${roleOverride}`);
  await agent.chat({ role_override: roleOverride });
} else if (!args.includes("--no-phone")) {
  const agentNumber = env("GUAVA_AGENT_NUMBER");
  if (!agentNumber) throw new Error("GUAVA_AGENT_NUMBER is not set");
  try {
    await agent.listenPhone(agentNumber);
  } catch (err) {
    // Keep the dashboard up even if the phone line cannot be claimed.
    console.error("[guava] phone listener stopped:", err);
  }
}

/**
 * Coldline backend entry point.
 * Starts the Guava voice agent on the inbound number. The GraphQL server
 * (schemas + resolvers) and database connection get wired in here next.
 *
 *   npm start                     phone (caller ID picks the role)
 *   npm run chat -- --as <role>   text chat; role = pharmacy | staff | facility:<id or a|b|c>
 */

import { env } from "../utils/env.ts";
import { agent } from "../../agents/inbound/agent.ts";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i < 0) return undefined;
  return args[i].includes("=") ? args[i].split("=")[1] : args[i + 1];
};

if (args.includes("--chat")) {
  const roleOverride = flag("--as") ?? env("COLDLINE_AS") ?? "pharmacy";
  console.log(`Chat mode as: ${roleOverride}`);
  await agent.chat({ role_override: roleOverride });
} else {
  const agentNumber = env("GUAVA_AGENT_NUMBER");
  if (!agentNumber) throw new Error("GUAVA_AGENT_NUMBER is not set");
  await agent.listenPhone(agentNumber);
}

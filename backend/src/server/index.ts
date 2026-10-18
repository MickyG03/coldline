/**
 * Coldline backend entry point.
 * Starts the Guava voice agent on the inbound number. The GraphQL server
 * (schemas + resolvers) and database connection get wired in here next.
 */

import { env } from "../utils/env.ts";
import { agent } from "../../agents/inbound/agent.ts";

const agentNumber = env("GUAVA_AGENT_NUMBER");
if (!agentNumber) throw new Error("GUAVA_AGENT_NUMBER is not set");

if (process.argv.includes("--chat")) {
  await agent.chat();
} else {
  await agent.listenPhone(agentNumber);
}

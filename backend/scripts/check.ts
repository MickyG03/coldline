/**
 * Health check for every service Coldline depends on.
 *   npm run check            - check all services
 *   npm run check -- --sms   - also send a test SMS to STAFF_PHONE
 */

import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import * as guava from "@guava-ai/guava-sdk";
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { env, isPhone } from "../src/utils/env.ts";

type Result = "ok" | "warn" | "fail";
const icons: Record<Result, string> = { ok: "✅", warn: "⚠️ ", fail: "❌" };
let failures = 0;

async function check(name: string, fn: () => Promise<[Result, string]>) {
  let result: Result;
  let detail: string;
  try {
    [result, detail] = await fn();
  } catch (err) {
    result = "fail";
    detail = err instanceof Error ? err.message : String(err);
  }
  if (result === "fail") failures++;
  console.log(`${icons[result]} ${name.padEnd(18)} ${detail}`);
}

const loadJson = (rel: string) =>
  JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf-8"));

await check("Env vars", async () => {
  const missing = ["GUAVA_API_KEY", "GUAVA_AGENT_NUMBER", "GOOGLE_MAPS_API_KEY", "TYPESAFE_API_KEY"]
    .filter((k) => !env(k));
  return missing.length ? ["fail", `missing ${missing.join(", ")}`] : ["ok", "required keys present"];
});

await check("Demo phones", async () => {
  const names = ["PHARMACY_PHONE", "STAFF_PHONE", "FACILITY_A_PHONE", "FACILITY_B_PHONE", "FACILITY_C_PHONE"];
  const bad = names.filter((k) => !isPhone(env(k)));
  return bad.length
    ? ["warn", `missing or not +1XXXXXXXXXX: ${bad.join(", ")}`]
    : ["ok", "all demo phones set"];
});

await check("Guava", async () => {
  const agentNumber = env("GUAVA_AGENT_NUMBER");
  const numbers = await new guava.Client({ apiKey: env("GUAVA_API_KEY") }).listNumbers();
  const owned = numbers.some((n) => n.phoneNumber === agentNumber);
  return owned
    ? ["ok", `key valid, ${agentNumber} is on the account`]
    : ["fail", `key valid, but ${agentNumber} not in [${numbers.map((n) => n.phoneNumber).join(", ")}]`];
});

await check("Google Routes", async () => {
  const [pharmacy] = loadJson("../src/database/seed/pharmacies.json");
  const [facility] = loadJson("../src/database/seed/facilities.json");
  const point = (p: { lat: number; lng: number }) => ({
    location: { latLng: { latitude: p.lat, longitude: p.lng } },
  });
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env("GOOGLE_MAPS_API_KEY")!,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify({ origin: point(pharmacy), destination: point(facility), travelMode: "DRIVE" }),
  });
  const body = await res.json();
  if (!res.ok) return ["fail", `${res.status} ${body?.error?.message ?? ""}`.trim()];
  const route = body.routes?.[0];
  if (!route) return ["fail", "no route returned"];
  const mins = Math.round(parseInt(route.duration) / 60);
  return ["ok", `${pharmacy.name} → ${facility.name}: ${mins} min, ${(route.distanceMeters / 1000).toFixed(1)} km`];
});

await check("TypeSafe (Jev)", async () => {
  const client = new TypeSafeClient({ apiKey: env("TYPESAFE_API_KEY"), defaultModel: "jev-latest" });
  const res = await client.systemOne({
    state: "Coordinator: We have fridge space for 300 units, but receiving closes at six.",
    questions: { conditional: noul("Acceptance depends on a time limit or other condition") },
  });
  return ["ok", `model ${res.model}, conditional=${res.answers.conditional.noul.toFixed(2)}`];
});

await check("Anthropic", async () => {
  const key = env("ANTHROPIC_API_KEY");
  if (!key) return ["warn", "not set (optional)"];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 5,
      messages: [{ role: "user", content: "Reply with OK." }],
    }),
  });
  const body = await res.json();
  return res.ok ? ["ok", `model ${body.model}`] : ["fail", `${res.status} ${body?.error?.message ?? ""}`];
});

await check("SQLite", async () => {
  const db = new DatabaseSync(":memory:");
  const row = db.prepare("SELECT sqlite_version() AS v").get() as { v: string };
  db.close();
  return ["ok", `built-in node:sqlite ${row.v}`];
});

await check("Guava SMS", async () => {
  if (!process.argv.includes("--sms")) return ["warn", "skipped (run with -- --sms to send a test text)"];
  const to = env("STAFF_PHONE");
  if (!isPhone(to)) return ["fail", "STAFF_PHONE must be +1XXXXXXXXXX"];
  await new guava.Client({ apiKey: env("GUAVA_API_KEY") })
    .sendSms(env("GUAVA_AGENT_NUMBER")!, to!, "Coldline health check: SMS works.");
  return ["ok", `test text sent to ${to}`];
});

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll required checks passed.");
process.exit(failures ? 1 : 0);

import * as guava from "@guava-ai/guava-sdk";
import { env, isPhone } from "../../utils/env.ts";

// Guava SMS: texts go out from GUAVA_AGENT_NUMBER, and only when COLDLINE_SMS=on.
// Default is off so tests, simulations and local dev never text anyone by accident.

export type SmsOutcome =
  | { status: "sent" }
  | { status: "simulated"; detail: string }
  | { status: "failed"; detail: string };

let client: guava.Client | undefined;

export const smsEnabled = () => env("COLDLINE_SMS")?.toLowerCase() === "on";

/** Mask all but the last four digits, for logs and the audit trail. */
export const maskPhone = (n: string | null | undefined) => (isPhone(n ?? undefined) ? `${n!.slice(0, 2)}•••••${n!.slice(-4)}` : null);

export async function sendSms(to: string | null | undefined, message: string): Promise<SmsOutcome> {
  if (!isPhone(to ?? undefined)) return { status: "simulated", detail: "no valid +1 number on file" };
  if (!smsEnabled()) return { status: "simulated", detail: "SMS off (set COLDLINE_SMS=on to text)" };
  const from = env("GUAVA_AGENT_NUMBER");
  if (!isPhone(from)) return { status: "failed", detail: "GUAVA_AGENT_NUMBER not set" };
  try {
    await (client ??= new guava.Client({ apiKey: env("GUAVA_API_KEY") })).sendSms(from!, to!, message);
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", detail: err instanceof Error ? err.message : String(err) };
  }
}

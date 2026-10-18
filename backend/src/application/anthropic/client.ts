import { env } from "../../utils/env.ts";

// Minimal Anthropic Messages API client (plain fetch). Used to drive simulated callers.

export const PERSONA_MODEL = "claude-haiku-5-5";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function complete(input: {
  system: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
}): Promise<string> {
  const key = env("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: input.model ?? PERSONA_MODEL,
        max_tokens: input.maxTokens ?? 200,
        system: input.system,
        messages: input.messages,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      return (body.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
    }
    // Retry rate limits / overload a couple of times.
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }
    throw new Error(`Anthropic ${res.status}: ${body?.error?.message ?? res.statusText}`);
  }
}

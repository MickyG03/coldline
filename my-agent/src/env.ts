import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Load .env from my-agent/ or the repo root, whichever exists first.
for (const rel of ["../.env", "../../.env"]) {
  const path = fileURLToPath(new URL(rel, import.meta.url));
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

export function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function isPhone(value: string | undefined): boolean {
  return !!value && /^\+1\d{10}$/.test(value);
}

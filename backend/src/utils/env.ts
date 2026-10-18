import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Load the repo-root .env (backend/src/utils -> repo root), or backend/.env if present.
for (const rel of ["../../.env", "../../../.env"]) {
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

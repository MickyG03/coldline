import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { env } from "../../utils/env.ts";
import { MIGRATIONS, SCHEMA } from "../models/index.ts";

// Default: backend/data/coldline.db (gitignored). Override with COLDLINE_DB_PATH (":memory:" works too).
const DEFAULT_PATH = fileURLToPath(new URL("../../../data/coldline.db", import.meta.url));

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
  if (db) return db;
  const path = env("COLDLINE_DB_PATH") ?? DEFAULT_PATH;
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  for (const m of MIGRATIONS) {
    const cols = db.prepare(`PRAGMA table_info(${m.table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === m.column)) db.exec(m.ddl);
  }
  return db;
}

export function closeDb() {
  db?.close();
  db = undefined;
}

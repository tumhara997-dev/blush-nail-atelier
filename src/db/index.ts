import { mkdirSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import * as schema from "./schema";

/**
 * Database access.
 * - DATABASE_URL or NETLIFY_DB_URL set → real Postgres (production / staging)
 * - neither set → embedded Postgres (PGlite) in ./.data/pglite for zero-setup local dev.
 * On Netlify, schema changes are applied by the deploy from netlify/database/migrations (never at runtime).
 *   PGlite is single-process: stop `npm run dev` before running db:* scripts.
 * Both expose the same Drizzle query API, so app code never cares which one is active.
 */
export type DB = PostgresJsDatabase<typeof schema>;

type Holder = { db?: DB; close?: () => Promise<void>; kind?: "postgres" | "pglite"; pglite?: PGlite };
const g = globalThis as unknown as { __blush?: Holder };
const holder: Holder = (g.__blush ??= {});

function init(): DB {
  if (holder.db) return holder.db;
  // DATABASE_URL (any Postgres) wins; on Netlify the hosted database provides NETLIFY_DB_URL automatically.
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL;
  if (url) {
    // Small pool: serverless functions run many short-lived instances.
    const client = postgres(url, { max: process.env.NETLIFY ? 3 : 10, prepare: false, idle_timeout: 20 });
    holder.db = drizzlePostgres(client, { schema });
    holder.close = () => client.end();
    holder.kind = "postgres";
  } else {
    const dir = path.resolve(process.env.PGLITE_DIR ?? ".data/pglite");
    mkdirSync(path.dirname(dir), { recursive: true });
    const client = new PGlite(dir, { extensions: { btree_gist } });
    holder.pglite = client;
    holder.db = drizzlePglite(client, { schema }) as unknown as DB;
    holder.close = () => client.close();
    holder.kind = "pglite";
  }
  return holder.db;
}

/** Lazily-initialised Drizzle instance (never opened at import time, so `next build` stays DB-free). */
export function db(): DB {
  return init();
}

export async function runMigrations() {
  init();
  const migrationsFolder = path.resolve("drizzle");
  if (holder.kind === "pglite") {
    await migratePglite(holder.db as never, { migrationsFolder });
  } else {
    await migratePostgres(holder.db!, { migrationsFolder });
  }
}

export async function closeDb() {
  await holder.close?.();
  holder.db = undefined;
}

/** Postgres error code for an EXCLUDE constraint violation (double booking). */
export function isOverlapError(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === "23P01" || e?.cause?.code === "23P01" || /no_staff_overlap/.test(e?.message ?? "");
}

export { schema };

import "./load-env";
import { and, eq, isNotNull, isNull, not, like } from "drizzle-orm";
import { runMigrations, closeDb, db, schema } from "./index";
import { mediaBytes } from "@/server/media";

/** Local / self-hosted migrations. On Netlify the deploy applies netlify/database/migrations instead. */
async function main() {
  if (process.env.NETLIFY_DB_URL && !process.env.DATABASE_URL) {
    throw new Error("Refusing to migrate the Netlify database directly — Netlify applies netlify/database/migrations on deploy.");
  }
  await runMigrations();
  console.log("✔ migrations applied");

  // One-time: move photos saved on local disk (before photos were stored in Postgres) into the database.
  const legacy = await db()
    .select({ id: schema.media.id, data: schema.media.data, path: schema.media.path })
    .from(schema.media)
    .where(and(isNull(schema.media.data), isNotNull(schema.media.path), not(like(schema.media.path, "/%"))));
  let moved = 0;
  for (const m of legacy) {
    const bytes = await mediaBytes(m);
    if (bytes) {
      await db().update(schema.media).set({ data: bytes, path: null }).where(eq(schema.media.id, m.id));
      moved++;
    }
  }
  if (moved) console.log(`✔ moved ${moved} photos from disk into the database`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closeDb);

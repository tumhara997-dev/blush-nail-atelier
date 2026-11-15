import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

// Replays netlify/database/migrations exactly as Netlify does (lexicographic order, whole file at a time)
// on an empty Postgres, then checks the starter content landed.
describe("netlify/database/migrations", () => {
  it("apply cleanly in order and seed the starter content", async () => {
    const dir = path.resolve(__dirname, "../netlify/database/migrations");
    const files = readdirSync(dir).filter((f) => /^\d+_[a-z0-9_-]+\.sql$/.test(f)).sort();
    expect(files.length).toBeGreaterThanOrEqual(4);

    const pg = new PGlite({ extensions: { btree_gist } });
    for (const f of files) await pg.exec(readFileSync(path.join(dir, f), "utf8"));

    const count = async (t: string) => (await pg.query<{ n: number }>(`select count(*)::int as n from ${t}`)).rows[0].n;
    expect(await count("services")).toBe(8);
    expect(await count("art_styles")).toBe(12);
    expect(await count("gallery_items")).toBe(10);
    expect(await count("business_hours")).toBe(7);
    expect(await count("settings")).toBe(3);
    expect(await count("staff")).toBe(1);
    const covers = await pg.query<{ n: number }>("select count(*)::int as n from art_styles where cover_media_id is not null");
    expect(covers.rows[0].n).toBe(4);
    const paths = await pg.query<{ path: string }>("select path from media");
    expect(paths.rows.every((r) => r.path.startsWith("/seed-gallery/"))).toBe(true);
    await pg.close();
  });
});

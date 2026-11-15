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
    expect(await count("staff")).toBe(2); // Blush Artist + demo artist Riya
    const covers = await pg.query<{ n: number }>("select count(*)::int as n from art_styles where cover_media_id is not null");
    expect(covers.rows[0].n).toBe(4);
    const paths = await pg.query<{ path: string }>("select path from media");
    expect(paths.rows.every((r) => r.path.startsWith("/seed-gallery/"))).toBe(true);

    // Demo data: present, all flagged, and fully removable.
    const demoUsers = async () => (await pg.query<{ n: number }>("select count(*)::int as n from users where staff_notes like '[DEMO]%'")).rows[0].n;
    expect(await demoUsers()).toBe(10);
    expect(await count("appointments")).toBe(21);
    const unflagged = await pg.query<{ n: number }>("select count(*)::int as n from appointments a join users u on u.id = a.customer_id where coalesce(u.staff_notes,'') not like '[DEMO]%'");
    expect(unflagged.rows[0].n).toBe(0);
    const noReminder = await pg.query<{ n: number }>("select count(*)::int as n from appointments where reminder_24h_at is null");
    expect(noReminder.rows[0].n).toBe(0);

    await pg.exec(readFileSync(path.resolve(__dirname, "../scripts/remove-demo-data.sql"), "utf8"));
    expect(await demoUsers()).toBe(0);
    expect(await count("appointments")).toBe(0);
    expect(await count("enquiries")).toBe(0);
    expect(await count("staff")).toBe(1);
    expect(await count("services")).toBe(8); // real content untouched
    await pg.close();
  });
});

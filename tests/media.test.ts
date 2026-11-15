import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

// Real upload path against a throwaway embedded Postgres.
const dir = mkdtempSync(path.join(tmpdir(), "blush-media-"));
process.env.PGLITE_DIR = path.join(dir, "db");
delete process.env.DATABASE_URL;
delete process.env.NETLIFY_DB_URL;

const { db, runMigrations, closeDb, schema } = await import("@/db");
const { saveImageBuffer, mediaBytes } = await import("@/server/media");
const { eq } = await import("drizzle-orm");

beforeAll(async () => {
  await runMigrations();
});
afterAll(async () => {
  await closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe("photo storage", () => {
  it("re-encodes to WebP, strips metadata, and stores bytes in Postgres", async () => {
    // A JPEG carrying EXIF metadata.
    const jpeg = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: "#c65b86" } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Make: "TestPhone", Model: "X" } } })
      .toBuffer();
    expect((await sharp(jpeg).metadata()).exif).toBeDefined();

    const saved = await saveImageBuffer(jpeg, "GALLERY");
    expect(saved.width).toBe(1600); // resized to max 1600px

    const [row] = await db().select().from(schema.media).where(eq(schema.media.id, saved.id));
    expect(row.path).toBeNull();
    const bytes = await mediaBytes(row);
    expect(bytes).not.toBeNull();
    const meta = await sharp(bytes!).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });

  it("serves seed photos from /public paths, never from disk outside storage", async () => {
    expect(await mediaBytes({ data: null, path: "/seed-gallery/x.webp" })).toBeNull();
    expect(await mediaBytes({ data: null, path: "../../package.json" })).toBeNull();
    expect(readFileSync(path.resolve("public/seed-gallery/classic-black-gel.webp")).length).toBeGreaterThan(0);
  });
});

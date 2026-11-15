import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

type Kind = (typeof schema.mediaKindEnum.enumValues)[number];

/**
 * Re-encode any uploaded image to WebP (max 1600px) and store it in Postgres.
 * Re-encoding strips EXIF/GPS metadata and neutralises malformed files.
 * Keeping bytes in the database means uploads survive on serverless hosts (Netlify/Vercel) with no extra storage service.
 */
export async function saveImageBuffer(input: Buffer, kind: Kind, opts: { ownerId?: string | null; appointmentId?: string | null } = {}) {
  const img = sharp(input, { failOn: "error" }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
  const { data, info } = await img.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const [row] = await db()
    .insert(schema.media)
    .values({ kind, data, path: null, mime: "image/webp", width: info.width, height: info.height, bytes: data.length, ownerId: opts.ownerId ?? null, appointmentId: opts.appointmentId ?? null })
    .returning({ id: schema.media.id, kind: schema.media.kind, width: schema.media.width, height: schema.media.height });
  return row;
}

export type UploadCheck = { ok: true } | { ok: false; error: string };

export function checkUpload(file: File): UploadCheck {
  if (!ACCEPTED.has(file.type)) return { ok: false, error: "Please upload JPG, PNG or WebP photos." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Each photo must be under 10 MB." };
  return { ok: true };
}

export async function saveUpload(file: File, kind: Kind, opts: { ownerId?: string | null; appointmentId?: string | null } = {}) {
  const check = checkUpload(file);
  if (!check.ok) throw new Error(check.error);
  return saveImageBuffer(Buffer.from(await file.arrayBuffer()), kind, opts);
}

/** Delete media rows (bytes go with them). */
export async function deleteMedia(rows: { id: string }[]) {
  if (rows.length) await db().delete(schema.media).where(inArray(schema.media.id, rows.map((r) => r.id)));
}

/** Bytes for a media row: from the database, or (legacy local dev) from STORAGE_DIR. */
export async function mediaBytes(m: { data: Buffer | null; path: string | null }): Promise<Buffer | null> {
  if (m.data) return m.data;
  if (!m.path || m.path.startsWith("/")) return null;
  const root = path.resolve(process.env.STORAGE_DIR ?? "./storage");
  const abs = path.resolve(root, m.path);
  if (!abs.startsWith(root + path.sep)) return null; // path traversal guard
  try {
    return await readFile(abs);
  } catch {
    return null;
  }
}

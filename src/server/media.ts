import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

export const storageRoot = () => path.resolve(process.env.STORAGE_DIR ?? "./storage");

type Kind = (typeof schema.mediaKindEnum.enumValues)[number];

/**
 * Re-encode any uploaded image to WebP (max 1600px). Re-encoding strips EXIF/GPS metadata
 * and neutralises malformed files. Files are stored outside /public and served via /media/[id].
 */
export async function saveImageBuffer(input: Buffer, kind: Kind, opts: { ownerId?: string | null; appointmentId?: string | null } = {}) {
  const img = sharp(input, { failOn: "error" }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
  const { data, info } = await img.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });

  const now = new Date();
  const rel = path.posix.join(kind.toLowerCase(), String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"), `${randomUUID()}.webp`);
  const abs = path.join(storageRoot(), rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);

  const [row] = await db()
    .insert(schema.media)
    .values({ kind, path: rel, mime: "image/webp", width: info.width, height: info.height, bytes: data.length, ownerId: opts.ownerId ?? null, appointmentId: opts.appointmentId ?? null })
    .returning();
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

/** Delete media rows and their files on disk. */
export async function deleteMedia(rows: { id: string; path: string }[]) {
  for (const r of rows) {
    const abs = path.resolve(storageRoot(), r.path);
    if (abs.startsWith(storageRoot() + path.sep)) await rm(abs, { force: true });
  }
  if (rows.length) await db().delete(schema.media).where(inArray(schema.media.id, rows.map((r) => r.id)));
}

export async function readMediaFile(rel: string): Promise<Buffer | null> {
  const root = storageRoot();
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep)) return null; // path traversal guard
  try {
    return await readFile(abs);
  } catch {
    return null;
  }
}

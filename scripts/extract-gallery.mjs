// One-off: pull the base64 gallery photos out of the original demo HTML into optimised WebP files.
// Usage: node scripts/extract-gallery.mjs "C:\path\to\BLUSH_customer_portal_demo.html"
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const src = process.argv[2];
if (!src) {
  console.error("Usage: node scripts/extract-gallery.mjs <demo.html>");
  process.exit(1);
}
const html = await readFile(src, "utf8");
const outDir = path.resolve("public/seed-gallery");
await mkdir(outDir, { recursive: true });

const re = /data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)"\s*alt="([^"]*)"/g;
let m;
let n = 0;
while ((m = re.exec(html))) {
  const alt = m[2].trim();
  const slug = alt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const buf = Buffer.from(m[1], "base64");
  // .rotate() applies EXIF orientation; output carries no metadata.
  const out = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  await writeFile(path.join(outDir, `${slug}.webp`), out.data);
  console.log(`${slug}.webp  ${out.info.width}x${out.info.height}  ${(out.data.length / 1024).toFixed(0)} KB  (was ${(buf.length / 1024).toFixed(0)} KB)`);
  n++;
}
console.log(`\n✔ extracted ${n} photos to ${outDir}`);

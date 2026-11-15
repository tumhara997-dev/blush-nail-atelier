import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { DEFAULT_SETTINGS } from "@/server/settings";

/**
 * The starter content (menu, styles, gallery, settings, hours, first artist), as plain rows with
 * deterministic ids. Used by `npm run db:seed` (local) and by `scripts/netlify-migrations.ts`, which
 * turns it into a SQL migration so Netlify's hosted database is filled on first deploy.
 *
 * Prices the demo didn't state are "price on enquiry"; durations are placeholders — the salon edits both in /admin.
 */

/** Stable UUID derived from a name, so the same content always gets the same id. */
export function stableId(name: string): string {
  const h = createHash("sha256").update(`blush:${name}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const CATEGORIES = [
  { id: stableId("cat:extensions"), name: "Extensions", slug: "extensions", sortOrder: 1 },
  { id: stableId("cat:polish-art"), name: "Polish & Art", slug: "polish-art", sortOrder: 2 },
  { id: stableId("cat:care-removal"), name: "Care & Removal", slug: "care-removal", sortOrder: 3 },
];

type ServiceSeed = {
  cat: string; name: string; summary: string; priceType: "FIXED" | "FROM" | "ON_ENQUIRY"; basePrice?: number;
  durationMin: number; bookingMode?: "INSTANT" | "REQUEST"; sortOrder: number;
};
const SERVICE_SEEDS: ServiceSeed[] = [
  { cat: "extensions", name: "Acrylic Extensions", summary: "Durable extensions with your preferred shape and length.", priceType: "FROM", basePrice: 49900, durationMin: 120, sortOrder: 1 },
  { cat: "extensions", name: "Gel Extensions", summary: "Glossy, polished extensions for an elegant finish.", priceType: "FROM", basePrice: 49900, durationMin: 120, sortOrder: 2 },
  { cat: "extensions", name: "Soft Gel Extensions", summary: "Lightweight soft gel extensions with custom styling.", priceType: "ON_ENQUIRY", durationMin: 120, bookingMode: "REQUEST", sortOrder: 3 },
  { cat: "extensions", name: "Temporary Nails", summary: "Reusable press-on style nails for your special moments.", priceType: "ON_ENQUIRY", durationMin: 45, bookingMode: "REQUEST", sortOrder: 4 },
  { cat: "polish-art", name: "Gel Polish", summary: "Long-lasting glossy gel colour on natural nails.", priceType: "ON_ENQUIRY", durationMin: 45, sortOrder: 1 },
  { cat: "polish-art", name: "Custom Nail Art", summary: "French, chrome, ombré, cat eye, 3D, bridal and more — share your inspiration.", priceType: "ON_ENQUIRY", durationMin: 60, bookingMode: "REQUEST", sortOrder: 2 },
  { cat: "care-removal", name: "Refill / Repair", summary: "Refills, nail repair and reshaping.", priceType: "ON_ENQUIRY", durationMin: 60, sortOrder: 1 },
  { cat: "care-removal", name: "Nail Removal", summary: "Safe removal of gel, acrylic and extensions.", priceType: "ON_ENQUIRY", durationMin: 30, sortOrder: 2 },
];

export const SERVICES = SERVICE_SEEDS.map((s) => ({
  id: stableId(`svc:${slugify(s.name)}`),
  categoryId: stableId(`cat:${s.cat}`),
  name: s.name,
  slug: slugify(s.name),
  summary: s.summary,
  priceType: s.priceType,
  basePrice: s.basePrice ?? null,
  durationMin: s.durationMin,
  bufferMin: 15,
  bookingMode: s.bookingMode ?? ("INSTANT" as const),
  sortOrder: s.sortOrder,
}));

const STYLE_NAMES = ["French Art", "Chrome", "Ombre", "Cat Eye", "3D & Bridal Art", "Foil & Glitter", "Stones & Floral", "Animal Print", "Spider Gel", "Dotting", "Dry Flower", "Custom Nail Art"];
export const ART_STYLES = STYLE_NAMES.map((name, i) => ({ id: stableId(`style:${slugify(name)}`), name, slug: slugify(name), sortOrder: i }));
const styleId = (name: string | null) => (name ? ART_STYLES.find((s) => s.name === name)!.id : null);

// Captions written from what each photo actually shows. Order = gallery order (first 8 are featured on the home page).
const GALLERY_SEEDS: { file: string; caption: string; style: string | null; cover?: boolean }[] = [
  { file: "burgundy-gold-french", caption: "Burgundy French tips with gold lining", style: "French Art", cover: true },
  { file: "butter-yellow-french-flowers", caption: "Butter-yellow French with flowers & gold", style: "French Art" },
  { file: "white-french-painted-blossoms", caption: "White French with painted blossoms", style: "Stones & Floral", cover: true },
  { file: "nude-french-white-bow", caption: "Nude French with a white bow", style: "French Art" },
  { file: "nude-almond-crystals", caption: "Nude almond set with crystals", style: "Stones & Floral" },
  { file: "red-leopard-crystal-extensions", caption: "Red leopard extensions with crystals", style: "Animal Print", cover: true },
  { file: "caramel-tortoiseshell-french", caption: "Caramel tortoiseshell & brown French", style: "Animal Print" },
  { file: "independence-day-tricolour", caption: "Independence Day tricolour art", style: "Custom Nail Art", cover: true },
  { file: "hot-pink-french-pedicure", caption: "Hot pink French pedicure", style: "French Art" },
  { file: "classic-black-gel", caption: "Classic black gel polish", style: null },
];

export const BUSINESS_HOURS = Array.from({ length: 7 }, (_, weekday) => ({ weekday, isClosed: false, openTime: "10:00", closeTime: "19:00" }));
export const FIRST_STAFF = { id: stableId("staff:blush-artist"), displayName: "Blush Artist" };
export const SETTINGS = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value }));

/** Gallery media + items + style covers. Photos are static files in /public/seed-gallery (served by the CDN). */
export async function galleryRows(publicDir = path.resolve("public")) {
  const media = [];
  const items = [];
  const covers: { styleId: string; mediaId: string }[] = [];
  for (const [i, g] of GALLERY_SEEDS.entries()) {
    const webPath = `/seed-gallery/${g.file}.webp`;
    const meta = await sharp(path.join(publicDir, "seed-gallery", `${g.file}.webp`)).metadata();
    const mediaId = stableId(`media:${g.file}`);
    media.push({ id: mediaId, kind: "GALLERY" as const, path: webPath, mime: "image/webp", width: meta.width ?? null, height: meta.height ?? null, bytes: meta.size ?? null });
    items.push({ id: stableId(`gallery:${g.file}`), mediaId, caption: g.caption, artStyleId: styleId(g.style), isFeatured: i < 8, isPublished: true, clientConsent: false, sortOrder: i });
    if (g.cover && g.style) covers.push({ styleId: styleId(g.style)!, mediaId });
  }
  return { media, items, covers };
}

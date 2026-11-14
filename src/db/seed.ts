import "./load-env";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { db, closeDb, schema } from "./index";
import { DEFAULT_SETTINGS } from "@/server/settings";
import { saveImageBuffer } from "@/server/media";
import { normalizeIndianMobile } from "@/lib/phone";

/**
 * Seeds the menu, nail-art styles and gallery from the original BLUSH demo.
 * Safe to re-run: each block is skipped when its data already exists.
 * Prices the demo didn't state are left as "price on enquiry" — set real prices in /admin/services.
 * Durations are placeholders — confirm with the salon.
 */
async function main() {
  const d = db();

  // Settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await d.insert(schema.settings).values({ key, value }).onConflictDoNothing();
  }

  // Opening hours (edit in /admin/schedule)
  for (let weekday = 0; weekday < 7; weekday++) {
    await d.insert(schema.businessHours).values({ weekday, isClosed: false, openTime: "10:00", closeTime: "19:00" }).onConflictDoNothing();
  }

  // Owner account + first technician
  const ownerPhone = normalizeIndianMobile(process.env.OWNER_PHONE ?? "+919999999999");
  if (!ownerPhone) throw new Error("OWNER_PHONE must be a valid Indian mobile number");
  let [owner] = await d.select().from(schema.users).where(eq(schema.users.phone, ownerPhone));
  if (!owner) {
    [owner] = await d.insert(schema.users).values({ phone: ownerPhone, name: "Salon Owner", role: "OWNER" }).returning();
    console.log(`✔ owner account ${ownerPhone}`);
  } else if (owner.role !== "OWNER") {
    await d.update(schema.users).set({ role: "OWNER" }).where(eq(schema.users.id, owner.id));
  }
  const staffCount = (await d.select({ n: sql<number>`count(*)::int` }).from(schema.staff))[0].n;
  if (!staffCount) {
    await d.insert(schema.staff).values({ displayName: "Blush Artist", userId: owner.id });
    console.log("✔ staff: Blush Artist");
  }

  // Menu
  const serviceCount = (await d.select({ n: sql<number>`count(*)::int` }).from(schema.services))[0].n;
  if (!serviceCount) {
    const cats = await d
      .insert(schema.serviceCategories)
      .values([
        { name: "Extensions", slug: "extensions", sortOrder: 1 },
        { name: "Polish & Art", slug: "polish-art", sortOrder: 2 },
        { name: "Care & Removal", slug: "care-removal", sortOrder: 3 },
      ])
      .returning();
    const cat = (slug: string) => cats.find((c) => c.slug === slug)!.id;
    await d.insert(schema.services).values([
      { categoryId: cat("extensions"), name: "Acrylic Extensions", slug: "acrylic-extensions", summary: "Durable extensions with your preferred shape and length.", priceType: "FROM", basePrice: 49900, durationMin: 120, emoji: "💗", sortOrder: 1 },
      { categoryId: cat("extensions"), name: "Gel Extensions", slug: "gel-extensions", summary: "Glossy, polished extensions for an elegant finish.", priceType: "FROM", basePrice: 49900, durationMin: 120, emoji: "✨", sortOrder: 2 },
      { categoryId: cat("extensions"), name: "Soft Gel Extensions", slug: "soft-gel-extensions", summary: "Lightweight soft gel extensions with custom styling.", priceType: "ON_ENQUIRY", durationMin: 120, bookingMode: "REQUEST", emoji: "🌸", sortOrder: 3 },
      { categoryId: cat("extensions"), name: "Temporary Nails", slug: "temporary-nails", summary: "Reusable press-on style nails for your special moments.", priceType: "ON_ENQUIRY", durationMin: 45, bookingMode: "REQUEST", emoji: "🎀", sortOrder: 4 },
      { categoryId: cat("polish-art"), name: "Gel Polish", slug: "gel-polish", summary: "Long-lasting glossy gel colour on natural nails.", priceType: "ON_ENQUIRY", durationMin: 45, emoji: "💅", sortOrder: 1 },
      { categoryId: cat("polish-art"), name: "Custom Nail Art", slug: "custom-nail-art", summary: "French, chrome, ombre, cat eye, 3D, bridal and more — share your inspiration.", priceType: "ON_ENQUIRY", durationMin: 60, bookingMode: "REQUEST", emoji: "🎨", sortOrder: 2 },
      { categoryId: cat("care-removal"), name: "Refill / Repair", slug: "refill-repair", summary: "Refills, nail repair and reshaping.", priceType: "ON_ENQUIRY", durationMin: 60, emoji: "🛠️", sortOrder: 1 },
      { categoryId: cat("care-removal"), name: "Nail Removal", slug: "nail-removal", summary: "Safe removal of gel, acrylic and extensions.", priceType: "ON_ENQUIRY", durationMin: 30, emoji: "🧴", sortOrder: 2 },
    ]);
    console.log("✔ services (8)");
  }

  // Nail art styles + gallery
  const styleCount = (await d.select({ n: sql<number>`count(*)::int` }).from(schema.artStyles))[0].n;
  if (!styleCount) {
    const names = ["French Art", "Chrome", "Ombre", "Cat Eye", "3D & Bridal Art", "Foil & Glitter", "Stones & Floral", "Animal Print", "Spider Gel", "Dotting", "Dry Flower", "Custom Nail Art"];
    const styles = await d
      .insert(schema.artStyles)
      .values(names.map((name, i) => ({ name, slug: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), sortOrder: i })))
      .returning();
    const style = (name: string) => styles.find((s) => s.name === name)?.id ?? null;

    const dir = path.resolve("seed-assets/gallery");
    const files = await readdir(dir).catch(() => [] as string[]);
    const meta: Record<string, { caption: string; style: string | null; cover?: boolean }> = {
      "classic-black-manicure": { caption: "Classic black manicure", style: null },
      "pink-french-pedicure": { caption: "Pink French pedicure", style: "French Art", cover: true },
      "leopard-nail-art": { caption: "Leopard nail art", style: "Animal Print", cover: true },
      "tricolour-nail-art": { caption: "Tricolour nail art", style: "Custom Nail Art" },
      "soft-nude-bow-design": { caption: "Soft nude bow design", style: "3D & Bridal Art", cover: true },
      "chocolate-french-tips": { caption: "Chocolate French tips", style: "French Art" },
      "floral-french-details": { caption: "Floral French details", style: "Stones & Floral", cover: true },
      "burgundy-french-extensions": { caption: "Burgundy French extensions", style: "French Art" },
      "pastel-floral-nail-art": { caption: "Pastel floral nail art", style: "Dry Flower", cover: true },
      "glossy-pink-nail-set": { caption: "Glossy pink nail set", style: "Custom Nail Art", cover: true },
    };
    let i = 0;
    for (const [slug, m] of Object.entries(meta)) {
      if (!files.includes(`${slug}.webp`)) continue;
      const media = await saveImageBuffer(await readFile(path.join(dir, `${slug}.webp`)), "GALLERY");
      const styleId = m.style ? style(m.style) : null;
      await d.insert(schema.galleryItems).values({ mediaId: media.id, caption: m.caption, artStyleId: styleId, isFeatured: i < 8, isPublished: true, sortOrder: i++ });
      if (m.cover && styleId) await d.update(schema.artStyles).set({ coverMediaId: media.id }).where(eq(schema.artStyles.id, styleId));
    }
    console.log(`✔ art styles (12), gallery photos (${i})`);
  }

  console.log("✔ seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closeDb);

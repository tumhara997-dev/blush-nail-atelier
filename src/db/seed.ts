import "./load-env";
import { eq, sql } from "drizzle-orm";
import { db, closeDb, schema } from "./index";
import { normalizeIndianMobile } from "@/lib/phone";
import { ART_STYLES, BUSINESS_HOURS, CATEGORIES, FIRST_STAFF, SERVICES, SETTINGS, galleryRows } from "./seed-content";

/**
 * Local seed: starter content (shared with the Netlify seed migration) + the owner account from OWNER_PHONE.
 * Safe to re-run: blocks are skipped when their data already exists.
 */
async function main() {
  const d = db();
  const count = async (t: typeof schema.services | typeof schema.artStyles | typeof schema.staff) => (await d.select({ n: sql<number>`count(*)::int` }).from(t))[0].n;

  for (const s of SETTINGS) await d.insert(schema.settings).values(s).onConflictDoNothing();
  for (const h of BUSINESS_HOURS) await d.insert(schema.businessHours).values(h).onConflictDoNothing();

  if (!(await count(schema.staff))) {
    await d.insert(schema.staff).values(FIRST_STAFF);
    console.log("✔ staff: Blush Artist");
  }

  if (!(await count(schema.services))) {
    await d.insert(schema.serviceCategories).values(CATEGORIES);
    await d.insert(schema.services).values(SERVICES);
    console.log(`✔ services (${SERVICES.length})`);
  }

  if (!(await count(schema.artStyles))) {
    await d.insert(schema.artStyles).values(ART_STYLES);
    const { media, items, covers } = await galleryRows();
    await d.insert(schema.media).values(media);
    await d.insert(schema.galleryItems).values(items);
    for (const c of covers) await d.update(schema.artStyles).set({ coverMediaId: c.mediaId }).where(eq(schema.artStyles.id, c.styleId));
    console.log(`✔ art styles (${ART_STYLES.length}), gallery photos (${items.length})`);
  }

  // Owner account (production gets this automatically on first login with OWNER_PHONE).
  const ownerPhone = normalizeIndianMobile(process.env.OWNER_PHONE ?? "+919999999999");
  if (!ownerPhone) throw new Error("OWNER_PHONE must be a valid Indian mobile number");
  let [owner] = await d.select().from(schema.users).where(eq(schema.users.phone, ownerPhone));
  if (!owner) {
    [owner] = await d.insert(schema.users).values({ phone: ownerPhone, name: "Salon Owner", role: "OWNER" }).returning();
    console.log(`✔ owner account ${ownerPhone}`);
  } else if (owner.role !== "OWNER") {
    await d.update(schema.users).set({ role: "OWNER" }).where(eq(schema.users.id, owner.id));
  }
  await d.update(schema.staff).set({ userId: owner.id }).where(eq(schema.staff.id, FIRST_STAFF.id));

  console.log("✔ seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closeDb);

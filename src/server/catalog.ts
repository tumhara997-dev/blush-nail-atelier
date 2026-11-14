import { asc, eq, inArray, and } from "drizzle-orm";
import { db, schema } from "@/db";

export type CatalogService = typeof schema.services.$inferSelect & {
  variants: (typeof schema.serviceVariants.$inferSelect)[];
  addOns: (typeof schema.addOns.$inferSelect)[];
};
export type CatalogCategory = typeof schema.serviceCategories.$inferSelect & { services: CatalogService[] };

/** Full active menu: categories → services → variants + allowed add-ons. */
export async function getCatalog(opts: { includeInactive?: boolean } = {}): Promise<CatalogCategory[]> {
  const d = db();
  const [cats, svcs, variants, links, addOns] = await Promise.all([
    d.select().from(schema.serviceCategories).orderBy(asc(schema.serviceCategories.sortOrder)),
    d.select().from(schema.services).orderBy(asc(schema.services.sortOrder), asc(schema.services.name)),
    d.select().from(schema.serviceVariants).orderBy(asc(schema.serviceVariants.sortOrder)),
    d.select().from(schema.serviceAddOns),
    d.select().from(schema.addOns).orderBy(asc(schema.addOns.sortOrder)),
  ]);
  const show = (active: boolean) => opts.includeInactive || active;
  return cats
    .map((c) => ({
      ...c,
      services: svcs
        .filter((s) => s.categoryId === c.id && show(s.isActive))
        .map((s) => ({
          ...s,
          variants: variants.filter((v) => v.serviceId === s.id && show(v.isActive)),
          addOns: addOns.filter((a) => show(a.isActive) && links.some((l) => l.serviceId === s.id && l.addOnId === a.id)),
        })),
    }))
    .filter((c) => c.services.length > 0 || opts.includeInactive);
}

/** One bookable service with the chosen variant/add-ons validated against what the service allows. */
export async function resolveSelection(serviceId: string, variantId: string | null, addOnIds: string[]) {
  const d = db();
  const [service] = await d.select().from(schema.services).where(and(eq(schema.services.id, serviceId), eq(schema.services.isActive, true))).limit(1);
  if (!service) return null;

  const variants = await d.select().from(schema.serviceVariants).where(and(eq(schema.serviceVariants.serviceId, serviceId), eq(schema.serviceVariants.isActive, true)));
  const variant = variantId ? variants.find((v) => v.id === variantId) ?? null : null;
  if (variantId && !variant) return null;
  if (!variantId && variants.length > 0) return null; // must pick a length/size

  let addOns: (typeof schema.addOns.$inferSelect)[] = [];
  if (addOnIds.length) {
    const allowed = await d
      .select({ a: schema.addOns })
      .from(schema.serviceAddOns)
      .innerJoin(schema.addOns, eq(schema.addOns.id, schema.serviceAddOns.addOnId))
      .where(and(eq(schema.serviceAddOns.serviceId, serviceId), inArray(schema.addOns.id, addOnIds), eq(schema.addOns.isActive, true)));
    addOns = allowed.map((r) => r.a);
    if (addOns.length !== new Set(addOnIds).size) return null;
  }
  return { service, variant, addOns };
}

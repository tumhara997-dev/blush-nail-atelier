import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function getArtStyles() {
  return db().select().from(schema.artStyles).where(eq(schema.artStyles.isActive, true)).orderBy(asc(schema.artStyles.sortOrder));
}

export async function getGallery(opts: { styleId?: string; featuredOnly?: boolean; includeUnpublished?: boolean } = {}) {
  const conds = [];
  if (!opts.includeUnpublished) conds.push(eq(schema.galleryItems.isPublished, true));
  if (opts.featuredOnly) conds.push(eq(schema.galleryItems.isFeatured, true));
  if (opts.styleId) conds.push(eq(schema.galleryItems.artStyleId, opts.styleId));
  return db()
    .select({
      id: schema.galleryItems.id,
      caption: schema.galleryItems.caption,
      mediaId: schema.galleryItems.mediaId,
      width: schema.media.width,
      height: schema.media.height,
      isFeatured: schema.galleryItems.isFeatured,
      isPublished: schema.galleryItems.isPublished,
      clientConsent: schema.galleryItems.clientConsent,
      artStyleId: schema.galleryItems.artStyleId,
      sortOrder: schema.galleryItems.sortOrder,
    })
    .from(schema.galleryItems)
    .innerJoin(schema.media, eq(schema.media.id, schema.galleryItems.mediaId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(schema.galleryItems.sortOrder), asc(schema.galleryItems.createdAt));
}

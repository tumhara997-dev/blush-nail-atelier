import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCatalog } from "@/server/catalog";
import { getCurrentUser } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { addDays, formatShortDate, salonDateString, salonDateTimeToUtc, weekdayOf } from "@/lib/time";
import { BookingWizard, type WizardCategory } from "@/components/booking-wizard";
import { Bow } from "@/components/ornaments";

export const metadata: Metadata = { title: "Book an appointment" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string; look?: string; note?: string }> }) {
  const { service, look, note } = await searchParams;
  const [catalog, user, { booking }, hours] = await Promise.all([
    getCatalog(),
    getCurrentUser(),
    getSettings("booking"),
    db().select().from(schema.businessHours).orderBy(asc(schema.businessHours.weekday)),
  ]);

  // "Book this look" from the gallery: only published gallery photos are accepted as references.
  let initialLook: { id: string; caption: string; mediaId: string } | null = null;
  if (look && z.string().uuid().safeParse(look).success) {
    const [g] = await db()
      .select({ id: schema.galleryItems.id, caption: schema.galleryItems.caption, mediaId: schema.galleryItems.mediaId })
      .from(schema.galleryItems)
      .where(and(eq(schema.galleryItems.id, look), eq(schema.galleryItems.isPublished, true)))
      .limit(1);
    initialLook = g ?? null;
  }

  const today = salonDateString();
  const days = Array.from({ length: booking.maxAdvanceDays + 1 }, (_, i) => {
    const date = addDays(today, i);
    const h = hours.find((x) => x.weekday === weekdayOf(date));
    return { date, label: formatShortDate(salonDateTimeToUtc(date, 12 * 60)), closed: !h || h.isClosed };
  });

  const categories: WizardCategory[] = catalog.map((c) => ({
    id: c.id,
    name: c.name,
    services: c.services.map((s) => ({
      id: s.id,
      name: s.name,
      summary: s.summary,
      emoji: s.emoji,
      priceType: s.priceType,
      basePrice: s.basePrice,
      durationMin: s.durationMin,
      bookingMode: s.bookingMode,
      variants: s.variants.map((v) => ({ id: v.id, name: v.name, price: v.price, durationMin: v.durationMin })),
      addOns: s.addOns.map((a) => ({ id: a.id, name: a.name, price: a.price, durationMin: a.durationMin })),
    })),
  }));

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <div className="mb-10 text-center">
        <Bow className="mx-auto h-6 w-10 text-gold" />
        <div className="eyebrow mt-4">Reserve your seat</div>
        <h1 className="h-display mt-3 text-[46px] leading-none sm:text-[56px]">Book an <em className="font-normal text-rose">appointment</em></h1>
      </div>
      <BookingWizard
        categories={categories}
        days={days}
        initialServiceId={service}
        initialNote={note ? note.slice(0, 300) : undefined}
        initialLook={initialLook}
        user={user ? { name: user.name } : null}
        cancelWindowHours={booking.cancelWindowHours}
      />
    </div>
  );
}

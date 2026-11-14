import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCatalog } from "@/server/catalog";
import { getCurrentUser } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { addDays, formatShortDate, salonDateString, salonDateTimeToUtc, weekdayOf } from "@/lib/time";
import { BookingWizard, type WizardCategory } from "@/components/booking-wizard";

export const metadata: Metadata = { title: "Book an appointment" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const [catalog, user, { booking }, hours] = await Promise.all([
    getCatalog(),
    getCurrentUser(),
    getSettings("booking"),
    db().select().from(schema.businessHours).orderBy(asc(schema.businessHours.weekday)),
  ]);

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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 text-center">
        <div className="eyebrow">Let&apos;s get you booked</div>
        <h1 className="h-display mt-2 text-4xl">Book an appointment</h1>
      </div>
      <BookingWizard
        categories={categories}
        days={days}
        initialServiceId={service}
        user={user ? { name: user.name } : null}
        cancelWindowHours={booking.cancelWindowHours}
      />
    </div>
  );
}

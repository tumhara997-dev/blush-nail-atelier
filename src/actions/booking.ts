"use server";

import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { createAppointment } from "@/server/appointments";
import { checkUpload, saveUpload } from "@/server/media";
import { isValidDateString } from "@/lib/time";
import { rateLimited } from "@/server/rate-limit";

const MAX_PHOTOS = 3;

const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  addOnIds: z.array(z.string().uuid()).max(10),
  date: z.string().refine(isValidDateString),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  note: z.string().max(1500).nullable(),
});

export type BookingResult = { ok: true; ref: string } | { ok: false; error: string };

export async function createBooking(form: FormData): Promise<BookingResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to confirm your booking." };
  if (!user.name) return { ok: false, error: "Please add your name first." };
  if (await rateLimited("booking", 10, 60 * 60_000)) return { ok: false, error: "Too many booking attempts. Please WhatsApp us." };

  const parsed = bookingSchema.safeParse({
    serviceId: form.get("serviceId"),
    variantId: form.get("variantId") || null,
    addOnIds: form.getAll("addOnIds").map(String),
    date: form.get("date"),
    time: form.get("time"),
    note: (form.get("note") as string | null) || null,
  });
  if (!parsed.success) return { ok: false, error: "Please complete all booking steps." };

  // Validate photos before creating anything, so a bad file never leaves a half-made booking.
  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > MAX_PHOTOS) return { ok: false, error: `Please attach up to ${MAX_PHOTOS} photos.` };
  for (const p of photos) {
    const check = checkUpload(p);
    if (!check.ok) return { ok: false, error: check.error };
  }

  const res = await createAppointment({ ...parsed.data, customerId: user.id, source: "WEB", actor: { id: user.id, role: user.role } });
  if (!res.ok) return res;

  for (const p of photos) {
    try {
      await saveUpload(p, "INSPIRATION", { ownerId: user.id, appointmentId: res.value.id });
    } catch (e) {
      console.error("Inspiration upload failed", e); // booking still stands; customer can share on WhatsApp
    }
  }
  return { ok: true, ref: res.value.ref };
}

import { and, eq } from "drizzle-orm";
import { db, isOverlapError, schema } from "@/db";
import { canTransition, type AppointmentStatus } from "@/lib/appointment-status";
import { estimate } from "@/lib/pricing";
import { newBookingRef } from "@/lib/ref";
import { getDayAvailability } from "./availability";
import { resolveSelection } from "./catalog";
import { notifyAppointment, type Template } from "./notifications";
import { getSettings } from "./settings";
import type { Role } from "./auth";

export type Actor = { id: string; role: Role } | null; // null = system (cron)
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const SLOT_TAKEN = "Sorry — that time was just taken. Please pick another slot.";
const STAFF_NOT_FREE = "That time isn't free: it clashes with another booking or time off, or the service would run past closing. Check the calendar.";

export type CreateAppointmentInput = {
  customerId: string;
  serviceId: string;
  variantId: string | null;
  addOnIds: string[];
  date: string; // YYYY-MM-DD (salon time)
  time: string; // HH:mm
  staffId?: string | null;
  note?: string | null;
  source: (typeof schema.bookingSourceEnum.enumValues)[number];
  actor: Actor;
};

export async function createAppointment(input: CreateAppointmentInput): Promise<Result<typeof schema.appointments.$inferSelect>> {
  const sel = await resolveSelection(input.serviceId, input.variantId, input.addOnIds);
  if (!sel) return { ok: false, error: "Please choose a valid service and options." };
  const { service, variant, addOns } = sel;
  const est = estimate(service, variant, addOns);
  const asStaff = !!input.actor && input.actor.role !== "CUSTOMER";

  const day = await getDayAvailability({
    serviceId: service.id,
    durationMin: est.durationMin,
    bufferMin: service.bufferMin,
    date: input.date,
    staffId: input.staffId,
    asStaff,
  });
  const slot = day.slots.find((s) => s.time === input.time);
  if (!slot) return { ok: false, error: asStaff ? STAFF_NOT_FREE : SLOT_TAKEN };
  const staffId = input.staffId && slot.staffIds.includes(input.staffId) ? input.staffId : slot.staffIds[0];

  const { booking } = await getSettings("booking");
  const status: AppointmentStatus =
    service.bookingMode === "REQUEST" ? "REQUESTED" : booking.autoConfirmInstant || asStaff ? "CONFIRMED" : "REQUESTED";

  const startsAt = new Date(slot.startsAt);
  const endsAt = new Date(startsAt.getTime() + (est.durationMin + service.bufferMin) * 60_000);

  try {
    const appt = await db().transaction(async (tx) => {
      const [a] = await tx
        .insert(schema.appointments)
        .values({
          ref: newBookingRef(),
          customerId: input.customerId,
          staffId,
          status,
          source: input.source,
          startsAt,
          endsAt,
          customerNote: input.note?.trim() || null,
          estimateMin: est.price ?? est.fromPrice,
          estimateMax: est.price,
          confirmedAt: status === "CONFIRMED" ? new Date() : null,
        })
        .returning();
      await tx.insert(schema.appointmentItems).values({
        appointmentId: a.id,
        serviceId: service.id,
        variantId: variant?.id ?? null,
        name: variant ? `${service.name} (${variant.name})` : service.name,
        price: est.price,
        durationMin: est.durationMin,
        addOns: addOns.map((x) => ({ id: x.id, name: x.name, price: x.price, durationMin: x.durationMin })),
      });
      await tx.insert(schema.appointmentEvents).values({
        appointmentId: a.id,
        actorId: input.actor?.id ?? null,
        fromStatus: null,
        toStatus: status,
        note: `Booked via ${input.source.toLowerCase().replace("_", "-")}`,
      });
      return a;
    });
    await notifyAppointment(appt.id, status === "CONFIRMED" ? "booking_confirmed" : "booking_requested", !asStaff);
    return { ok: true, value: appt };
  } catch (e) {
    if (isOverlapError(e)) return { ok: false, error: SLOT_TAKEN };
    throw e;
  }
}

export type TransitionExtras = {
  quotedTotal?: number | null;
  quoteNote?: string | null;
  finalTotal?: number | null;
  cancelReason?: string | null;
  note?: string | null;
};

const NOTIFY_ON: Partial<Record<AppointmentStatus, Template>> = {
  QUOTED: "quote_ready",
  CONFIRMED: "booking_confirmed",
  CANCELLED: "booking_cancelled",
};

/** The only way an appointment's status changes. Validates the move, records an audit event, notifies. */
export async function transition(id: string, to: AppointmentStatus, actor: Actor, extras: TransitionExtras = {}): Promise<Result<null>> {
  const [a] = await db().select().from(schema.appointments).where(eq(schema.appointments.id, id)).limit(1);
  if (!a) return { ok: false, error: "Appointment not found." };
  if (!canTransition(a.status, to)) return { ok: false, error: `Cannot change from ${a.status} to ${to}.` };

  const now = new Date();
  const patch: Partial<typeof schema.appointments.$inferInsert> = { status: to, updatedAt: now };
  if (to === "QUOTED") {
    if (extras.quotedTotal == null) return { ok: false, error: "Enter the quoted price." };
    const { booking } = await getSettings("booking");
    patch.quotedTotal = extras.quotedTotal;
    patch.quoteNote = extras.quoteNote ?? null;
    patch.quoteExpiresAt = new Date(now.getTime() + booking.quoteValidHours * 3_600_000);
  }
  if (to === "CONFIRMED") patch.confirmedAt = now;
  if (to === "CHECKED_IN") patch.checkedInAt = now;
  if (to === "COMPLETED") {
    patch.completedAt = now;
    patch.finalTotal = extras.finalTotal ?? a.quotedTotal ?? a.estimateMax ?? null;
  }
  if (to === "CANCELLED") {
    patch.cancelledAt = now;
    patch.cancelledBy = actor?.role ?? null;
    patch.cancelReason = extras.cancelReason ?? null;
  }

  const updated = await db().transaction(async (tx) => {
    const rows = await tx
      .update(schema.appointments)
      .set(patch)
      .where(and(eq(schema.appointments.id, id), eq(schema.appointments.status, a.status)))
      .returning({ id: schema.appointments.id });
    if (!rows.length) return false;
    await tx.insert(schema.appointmentEvents).values({
      appointmentId: id,
      actorId: actor?.id ?? null,
      fromStatus: a.status,
      toStatus: to,
      note: extras.note ?? extras.cancelReason ?? extras.quoteNote ?? null,
    });
    return true;
  });
  if (!updated) return { ok: false, error: "This appointment was just updated by someone else. Please refresh." };

  const template = NOTIFY_ON[to];
  if (template) await notifyAppointment(id, template);
  return { ok: true, value: null };
}

/** Staff move an appointment to another time and/or technician. */
export async function reschedule(id: string, date: string, time: string, staffId: string | null, actor: Actor): Promise<Result<null>> {
  const d = db();
  const [a] = await d.select().from(schema.appointments).where(eq(schema.appointments.id, id)).limit(1);
  if (!a) return { ok: false, error: "Appointment not found." };
  if (!["REQUESTED", "QUOTED", "CONFIRMED"].includes(a.status)) return { ok: false, error: "Only upcoming appointments can be moved." };
  const [item] = await d.select().from(schema.appointmentItems).where(eq(schema.appointmentItems.appointmentId, id)).limit(1);
  if (!item) return { ok: false, error: "Appointment has no service." };

  const totalMin = Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60_000);
  const day = await getDayAvailability({
    serviceId: item.serviceId,
    durationMin: item.durationMin,
    bufferMin: Math.max(0, totalMin - item.durationMin),
    date,
    staffId,
    asStaff: true,
    excludeAppointmentId: id,
  });
  const slot = day.slots.find((s) => s.time === time);
  if (!slot) return { ok: false, error: STAFF_NOT_FREE };
  const newStaff = staffId && slot.staffIds.includes(staffId) ? staffId : slot.staffIds[0];
  const startsAt = new Date(slot.startsAt);
  const endsAt = new Date(startsAt.getTime() + totalMin * 60_000);

  try {
    await d.transaction(async (tx) => {
      await tx.update(schema.appointments).set({ startsAt, endsAt, staffId: newStaff, reminder24hAt: null, updatedAt: new Date() }).where(eq(schema.appointments.id, id));
      await tx.insert(schema.appointmentEvents).values({ appointmentId: id, actorId: actor?.id ?? null, fromStatus: a.status, toStatus: a.status, note: `Moved to ${date} ${time}` });
    });
  } catch (e) {
    if (isOverlapError(e)) return { ok: false, error: SLOT_TAKEN };
    throw e;
  }
  await notifyAppointment(id, "booking_rescheduled");
  return { ok: true, value: null };
}

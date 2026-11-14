import { and, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { ACTIVE_STATUSES } from "@/lib/appointment-status";
import { computeSlots, type Interval, type Slot } from "@/lib/slots";
import { addDays, hmToMinutes, salonDateString, salonDateTimeToUtc, weekdayOf } from "@/lib/time";
import { getSettings } from "./settings";

/** Staff who can perform a service. If no staff are linked to the service, every bookable staff member can. */
export async function staffForService(serviceId: string) {
  const d = db();
  const all = await d.select().from(schema.staff).where(eq(schema.staff.isBookable, true)).orderBy(schema.staff.sortOrder);
  const links = await d.select().from(schema.staffServices).where(eq(schema.staffServices.serviceId, serviceId));
  return links.length ? all.filter((s) => links.some((l) => l.staffId === s.id)) : all;
}

type Options = {
  serviceId: string;
  durationMin: number;
  bufferMin: number;
  date: string;
  staffId?: string | null;
  /** Staff creating bookings may bypass lead time and the advance-booking limit. */
  asStaff?: boolean;
  /** Appointment being moved — ignore its own time when checking clashes. */
  excludeAppointmentId?: string;
};

export type DayAvailability = { date: string; closed: boolean; slots: Slot[] };

/** Earliest bookable start for a service within the next `days` days (for the "next free appointment" badge). */
export async function findNextFreeSlot(service: { id: string; durationMin: number; bufferMin: number }, days = 14) {
  const today = salonDateString();
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const day = await getDayAvailability({ serviceId: service.id, durationMin: service.durationMin, bufferMin: service.bufferMin, date });
    if (day.slots.length) return { date, time: day.slots[0].time, startsAt: new Date(day.slots[0].startsAt), dayOffset: i };
  }
  return null;
}

export async function getDayAvailability(o: Options): Promise<DayAvailability> {
  const { booking } = await getSettings("booking");
  const today = salonDateString();
  const empty = (closed: boolean): DayAvailability => ({ date: o.date, closed, slots: [] });

  if (!o.asStaff && (o.date < today || o.date > addDays(today, booking.maxAdvanceDays))) return empty(false);

  const d = db();
  const [hours] = await d.select().from(schema.businessHours).where(eq(schema.businessHours.weekday, weekdayOf(o.date)));
  if (!hours || hours.isClosed) return empty(true);

  let staff = await staffForService(o.serviceId);
  if (o.staffId) staff = staff.filter((s) => s.id === o.staffId);
  if (!staff.length) return empty(false);

  const dayStart = salonDateTimeToUtc(o.date, 0);
  const dayEnd = salonDateTimeToUtc(o.date, 24 * 60);
  const staffIds = staff.map((s) => s.id);

  const [appts, offs] = await Promise.all([
    d.select({ id: schema.appointments.id, staffId: schema.appointments.staffId, s: schema.appointments.startsAt, e: schema.appointments.endsAt })
      .from(schema.appointments)
      .where(and(
        inArray(schema.appointments.staffId, staffIds),
        inArray(schema.appointments.status, ACTIVE_STATUSES),
        lt(schema.appointments.startsAt, dayEnd),
        gt(schema.appointments.endsAt, dayStart),
      )),
    d.select().from(schema.timeOff).where(and(
      or(isNull(schema.timeOff.staffId), inArray(schema.timeOff.staffId, staffIds)),
      lt(schema.timeOff.startsAt, dayEnd),
      gt(schema.timeOff.endsAt, dayStart),
    )),
  ]);

  const busyFor = (staffId: string): Interval[] => [
    ...appts.filter((a) => a.staffId === staffId && a.id !== o.excludeAppointmentId).map((a) => ({ start: a.s.getTime(), end: a.e.getTime() })),
    ...offs.filter((t) => t.staffId === null || t.staffId === staffId).map((t) => ({ start: t.startsAt.getTime(), end: t.endsAt.getTime() })),
  ];

  const earliestStart = o.asStaff ? new Date(0) : new Date(Date.now() + booking.minLeadMin * 60_000);
  const slots = computeSlots({
    date: o.date,
    openMin: hmToMinutes(hours.openTime),
    closeMin: hmToMinutes(hours.closeTime),
    durationMin: o.durationMin,
    bufferMin: o.bufferMin,
    stepMin: o.asStaff ? 15 : booking.slotStepMin, // staff can book any quarter hour
    earliestStart,
    staff: staff.map((s) => ({ id: s.id, busy: busyFor(s.id) })),
  });
  return { date: o.date, closed: false, slots };
}

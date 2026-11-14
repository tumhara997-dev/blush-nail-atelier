import { and, asc, desc, eq, gte, ilike, inArray, lt, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import type { AppointmentStatus } from "@/lib/appointment-status";

const A = schema.appointments;

async function attachItems<T extends { id: string }>(rows: T[]) {
  if (!rows.length) return rows.map((r) => ({ ...r, items: [] as (typeof schema.appointmentItems.$inferSelect)[] }));
  const items = await db().select().from(schema.appointmentItems).where(inArray(schema.appointmentItems.appointmentId, rows.map((r) => r.id)));
  return rows.map((r) => ({ ...r, items: items.filter((i) => i.appointmentId === r.id) }));
}

// ── Customer ─────────────────────────────────────────────────────────
export async function listCustomerAppointments(userId: string) {
  const rows = await db().select().from(A).where(eq(A.customerId, userId)).orderBy(desc(A.startsAt));
  return attachItems(rows);
}

export async function getCustomerAppointment(userId: string, ref: string) {
  const [row] = await db().select().from(A).where(and(eq(A.customerId, userId), eq(A.ref, ref))).limit(1);
  if (!row) return null;
  const [withItems] = await attachItems([row]);
  const photos = await db().select({ id: schema.media.id }).from(schema.media).where(eq(schema.media.appointmentId, row.id));
  return { ...withItems, photos };
}

// ── Staff ────────────────────────────────────────────────────────────
export type AppointmentFilter = {
  from?: Date;
  to?: Date;
  statuses?: AppointmentStatus[];
  staffId?: string;
  customerId?: string;
  q?: string;
  order?: "asc" | "desc";
  limit?: number;
};

export async function listAppointments(f: AppointmentFilter = {}) {
  const conds: SQL[] = [];
  if (f.from) conds.push(gte(A.startsAt, f.from));
  if (f.to) conds.push(lt(A.startsAt, f.to));
  if (f.statuses?.length) conds.push(inArray(A.status, f.statuses));
  if (f.staffId) conds.push(eq(A.staffId, f.staffId));
  if (f.customerId) conds.push(eq(A.customerId, f.customerId));
  if (f.q) {
    const q = `%${f.q.replace(/[%_]/g, "")}%`;
    conds.push(or(ilike(schema.users.name, q), ilike(schema.users.phone, q), ilike(A.ref, q))!);
  }
  const rows = await db()
    .select({
      id: A.id, ref: A.ref, status: A.status, source: A.source, startsAt: A.startsAt, endsAt: A.endsAt,
      staffId: A.staffId, customerNote: A.customerNote, quotedTotal: A.quotedTotal, estimateMin: A.estimateMin, estimateMax: A.estimateMax,
      finalTotal: A.finalTotal, createdAt: A.createdAt,
      customerId: schema.users.id, customerName: schema.users.name, customerPhone: schema.users.phone,
      staffName: schema.staff.displayName, staffColor: schema.staff.calendarColor,
    })
    .from(A)
    .innerJoin(schema.users, eq(schema.users.id, A.customerId))
    .leftJoin(schema.staff, eq(schema.staff.id, A.staffId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(f.order === "desc" ? desc(A.startsAt) : asc(A.startsAt))
    .limit(f.limit ?? 200);
  return attachItems(rows);
}

export async function getAppointmentDetail(id: string) {
  const actor = alias(schema.users, "actor");
  const [row] = await db()
    .select({ a: A, customer: schema.users, staff: schema.staff })
    .from(A)
    .innerJoin(schema.users, eq(schema.users.id, A.customerId))
    .leftJoin(schema.staff, eq(schema.staff.id, A.staffId))
    .where(eq(A.id, id))
    .limit(1);
  if (!row) return null;
  const [items, events, photos, history] = await Promise.all([
    db().select().from(schema.appointmentItems).where(eq(schema.appointmentItems.appointmentId, id)),
    db()
      .select({ e: schema.appointmentEvents, actorName: actor.name, actorRole: actor.role })
      .from(schema.appointmentEvents)
      .leftJoin(actor, eq(actor.id, schema.appointmentEvents.actorId))
      .where(eq(schema.appointmentEvents.appointmentId, id))
      .orderBy(asc(schema.appointmentEvents.createdAt)),
    db().select({ id: schema.media.id }).from(schema.media).where(eq(schema.media.appointmentId, id)),
    db().select({ id: A.id, ref: A.ref, status: A.status, startsAt: A.startsAt }).from(A).where(eq(A.customerId, row.customer.id)).orderBy(desc(A.startsAt)).limit(10),
  ]);
  return { ...row, items, events, photos, history };
}

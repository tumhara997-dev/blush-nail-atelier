import Link from "next/link";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { listAppointments } from "@/server/queries";
import { AppointmentTable } from "@/components/admin/appointment-table";
import { addDays, formatDate, salonDateString, salonDateTimeToUtc } from "@/lib/time";
import { formatPaise } from "@/lib/money";

export const metadata = { title: "Today" };

export default async function AdminHome() {
  const today = salonDateString();
  const start = salonDateTimeToUtc(today, 0);
  const end = salonDateTimeToUtc(addDays(today, 1), 0);
  const monthStart = salonDateTimeToUtc(`${today.slice(0, 7)}-01`, 0);
  const A = schema.appointments;

  const [todays, requests, quoted, [enq], [month], [upcomingWeek]] = await Promise.all([
    listAppointments({ from: start, to: end, statuses: ["REQUESTED", "QUOTED", "CONFIRMED", "CHECKED_IN", "COMPLETED", "NO_SHOW"] }),
    listAppointments({ from: new Date(), statuses: ["REQUESTED"] }),
    listAppointments({ from: new Date(), statuses: ["QUOTED"] }),
    db().select({ n: sql<number>`count(*)::int` }).from(schema.enquiries).where(eq(schema.enquiries.status, "NEW")),
    db()
      .select({
        revenue: sql<number>`coalesce(sum(${A.finalTotal}) filter (where ${A.status} = 'COMPLETED'), 0)::int`,
        completed: sql<number>`(count(*) filter (where ${A.status} = 'COMPLETED'))::int`,
        noShows: sql<number>`(count(*) filter (where ${A.status} = 'NO_SHOW'))::int`,
      })
      .from(A)
      .where(and(gte(A.startsAt, monthStart), lt(A.startsAt, end))),
    db().select({ n: sql<number>`count(*)::int` }).from(A).where(and(gte(A.startsAt, new Date()), lt(A.startsAt, salonDateTimeToUtc(addDays(today, 7), 0)), inArray(A.status, ["CONFIRMED", "REQUESTED", "QUOTED"]))),
  ]);

  const Stat = ({ label, value, href }: { label: string; value: string | number; href?: string }) => {
    const body = (
      <>
        <div className="text-2xl font-bold text-plum">{value}</div>
        <div className="text-xs text-muted">{label}</div>
      </>
    );
    return href ? <Link href={href} className="card p-4 hover:border-pink">{body}</Link> : <div className="card p-4">{body}</div>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Today</div>
          <h1 className="h-display text-3xl">{formatDate(start)}</h1>
        </div>
        <Link href="/admin/appointments/new" className="btn-primary btn-sm">+ New booking</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Appointments today" value={todays.filter((a) => a.status !== "NO_SHOW").length} href="/admin/calendar" />
        <Stat label="Next 7 days" value={upcomingWeek.n} href="/admin/appointments" />
        <Stat label="New enquiries" value={enq.n} href="/admin/enquiries" />
        <Stat label="Completed this month" value={`${month.completed} · ${formatPaise(month.revenue)}`} />
        <Stat label="No-shows this month" value={month.noShows} />
      </div>

      {requests.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-xl text-plum">⏳ Waiting for you ({requests.length})</h2>
          <p className="mb-3 text-sm text-muted">Requests that need a quote or confirmation.</p>
          <AppointmentTable rows={requests} />
        </section>
      )}

      <section>
        <h2 className="mb-3 font-serif text-xl text-plum">Today&apos;s schedule</h2>
        <AppointmentTable rows={todays} showDate={false} empty="No appointments today." />
      </section>

      {quoted.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl text-plum">Quotes waiting for customer ({quoted.length})</h2>
          <AppointmentTable rows={quoted} />
        </section>
      )}
    </div>
  );
}

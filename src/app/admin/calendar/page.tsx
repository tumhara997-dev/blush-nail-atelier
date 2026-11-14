import Link from "next/link";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { listAppointments } from "@/server/queries";
import { STATUS_LABEL } from "@/lib/appointment-status";
import { addDays, formatDate, formatTime, hmToMinutes, isValidDateString, minutesToHm, salonDateString, salonDateTimeToUtc, salonMinutesOfDay, weekdayOf, formatHm } from "@/lib/time";

export const metadata = { title: "Calendar" };

const PX_PER_MIN = 1.3;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const date = sp.date && isValidDateString(sp.date) ? sp.date : salonDateString();
  const start = salonDateTimeToUtc(date, 0);
  const end = salonDateTimeToUtc(addDays(date, 1), 0);

  const [appts, staff, [hours], offs] = await Promise.all([
    listAppointments({ from: start, to: end, statuses: ["REQUESTED", "QUOTED", "CONFIRMED", "CHECKED_IN", "COMPLETED", "NO_SHOW"] }),
    db().select().from(schema.staff).orderBy(asc(schema.staff.sortOrder)),
    db().select().from(schema.businessHours).where(eq(schema.businessHours.weekday, weekdayOf(date))),
    db().select().from(schema.timeOff).where(and(lt(schema.timeOff.startsAt, end), gt(schema.timeOff.endsAt, start))),
  ]);

  const columns = staff.filter((s) => s.isBookable || appts.some((a) => a.staffId === s.id));
  const open = hours && !hours.isClosed ? hmToMinutes(hours.openTime) : 10 * 60;
  const close = hours && !hours.isClosed ? hmToMinutes(hours.closeTime) : 19 * 60;
  const dayStartMin = Math.min(open, ...appts.map((a) => salonMinutesOfDay(a.startsAt))) - 30;
  const dayEndMin = Math.max(close, ...appts.map((a) => salonMinutesOfDay(a.endsAt) || 24 * 60)) + 30;
  const first = Math.max(0, Math.floor(dayStartMin / 60) * 60);
  const last = Math.min(24 * 60, Math.ceil(dayEndMin / 60) * 60);
  const height = (last - first) * PX_PER_MIN;
  const top = (d: Date) => (Math.max(first, salonMinutesOfDay(d)) - first) * PX_PER_MIN;
  const blockHeight = (s: Date, e: Date) => Math.max(22, ((e.getTime() - s.getTime()) / 60_000) * PX_PER_MIN);
  const clamp = (d: Date) => (d < start ? start : d > end ? end : d);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h-display text-3xl">{formatDate(salonDateTimeToUtc(date, 720))}</h1>
          <p className="text-sm text-muted">{hours?.isClosed ? "Closed" : `Open ${formatHm(minutesToHm(open))} – ${formatHm(minutesToHm(close))}`} · {appts.length} appointment{appts.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="btn-outline btn-sm" href={`/admin/calendar?date=${addDays(date, -1)}`}>← Prev</Link>
          <Link className="btn-outline btn-sm" href="/admin/calendar">Today</Link>
          <Link className="btn-outline btn-sm" href={`/admin/calendar?date=${addDays(date, 1)}`}>Next →</Link>
          <form action="/admin/calendar" className="flex gap-1">
            <input type="date" name="date" defaultValue={date} className="input py-1.5" aria-label="Go to date" />
            <button className="btn-ghost btn-sm">Go</button>
          </form>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="card p-5 text-sm text-muted">Add a staff member to see the calendar.</p>
      ) : (
        <div className="card overflow-x-auto">
          <div className="grid min-w-[560px]" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(180px, 1fr))` }}>
            <div className="border-b border-line" />
            {columns.map((s) => (
              <div key={s.id} className="border-b border-l border-line px-3 py-2 text-sm font-bold">
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.calendarColor }} />
                {s.displayName}
              </div>
            ))}

            <div className="relative" style={{ height }}>
              {Array.from({ length: (last - first) / 60 + 1 }, (_, i) => (
                <div key={i} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted" style={{ top: i * 60 * PX_PER_MIN }}>
                  {formatHm(minutesToHm(first + i * 60)).replace(":00", "")}
                </div>
              ))}
            </div>

            {columns.map((s) => (
              <div key={s.id} className="relative border-l border-line" style={{ height }}>
                {Array.from({ length: (last - first) / 60 }, (_, i) => (
                  <div key={i} className="absolute inset-x-0 border-t border-line/60" style={{ top: i * 60 * PX_PER_MIN }} />
                ))}
                {/* closed hours shading */}
                <div className="absolute inset-x-0 bg-stone-100/70" style={{ top: 0, height: Math.max(0, (open - first) * PX_PER_MIN) }} />
                <div className="absolute inset-x-0 bg-stone-100/70" style={{ top: (close - first) * PX_PER_MIN, bottom: 0 }} />
                {offs.filter((t) => t.staffId === null || t.staffId === s.id).map((t) => (
                  <div key={t.id} className="absolute inset-x-1 rounded-md bg-[repeating-linear-gradient(45deg,#f3e8ec,#f3e8ec_6px,#fff_6px,#fff_12px)] px-2 py-1 text-[11px] text-muted" style={{ top: top(clamp(t.startsAt)), height: blockHeight(clamp(t.startsAt), clamp(t.endsAt)) }}>
                    Blocked{t.reason ? `: ${t.reason}` : ""}
                  </div>
                ))}
                {appts.filter((a) => a.staffId === s.id).map((a) => (
                  <Link
                    key={a.id}
                    href={`/admin/appointments/${a.id}`}
                    className={`absolute inset-x-1 overflow-hidden rounded-lg border-l-4 bg-white px-2 py-1 text-xs shadow-sm ring-1 ring-line hover:z-10 hover:shadow-md ${a.status === "NO_SHOW" ? "opacity-50" : ""} ${a.status === "REQUESTED" || a.status === "QUOTED" ? "border-dashed" : ""}`}
                    style={{ top: top(a.startsAt), height: blockHeight(a.startsAt, a.endsAt), borderLeftColor: s.calendarColor }}
                  >
                    <div className="font-bold">{formatTime(a.startsAt)} · {a.customerName ?? "—"}</div>
                    <div className="truncate text-muted">{a.items.map((i) => i.name).join(" + ")}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">{STATUS_LABEL[a.status]}</div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

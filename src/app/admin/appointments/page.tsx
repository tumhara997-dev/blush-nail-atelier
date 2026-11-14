import Link from "next/link";
import { listAppointments } from "@/server/queries";
import { AppointmentTable } from "@/components/admin/appointment-table";
import { STATUS_LABEL, type AppointmentStatus } from "@/lib/appointment-status";
import { addDays, salonDateString, salonDateTimeToUtc } from "@/lib/time";

export const metadata = { title: "Appointments" };

const RANGES = { upcoming: "Upcoming", today: "Today", week: "Next 7 days", past: "Past 30 days", all: "All" } as const;

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ range?: string; status?: string; q?: string }> }) {
  const sp = await searchParams;
  const range = (sp.range && sp.range in RANGES ? sp.range : "upcoming") as keyof typeof RANGES;
  const status = sp.status && sp.status in STATUS_LABEL ? (sp.status as AppointmentStatus) : undefined;
  const q = sp.q?.trim().slice(0, 60) || undefined;

  const today = salonDateString();
  const dayStart = salonDateTimeToUtc(today, 0);
  const bounds: Record<keyof typeof RANGES, { from?: Date; to?: Date; order: "asc" | "desc" }> = {
    upcoming: { from: dayStart, order: "asc" },
    today: { from: dayStart, to: salonDateTimeToUtc(addDays(today, 1), 0), order: "asc" },
    week: { from: dayStart, to: salonDateTimeToUtc(addDays(today, 7), 0), order: "asc" },
    past: { from: salonDateTimeToUtc(addDays(today, -30), 0), to: new Date(), order: "desc" },
    all: { order: "desc" },
  };
  const b = bounds[range];
  const rows = await listAppointments({
    ...b,
    statuses: status ? [status] : range === "upcoming" ? ["REQUESTED", "QUOTED", "CONFIRMED", "CHECKED_IN"] : undefined,
    q,
  });

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { range, status, q, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/appointments?${p}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-3xl">Appointments</h1>
        <Link href="/admin/appointments/new" className="btn-primary btn-sm">+ New booking</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(RANGES).map(([k, label]) => (
          <Link key={k} href={link({ range: k })} className={`rounded-full border px-3 py-1 text-xs font-bold ${range === k ? "border-pink bg-pink text-white" : "border-line bg-white text-rose"}`}>{label}</Link>
        ))}
      </div>
      <form className="flex flex-wrap gap-2" action="/admin/appointments">
        <input type="hidden" name="range" value={range} />
        <input name="q" defaultValue={q} placeholder="Search name, phone or BL- ref" className="input max-w-xs" aria-label="Search" />
        <select name="status" defaultValue={status ?? ""} className="input max-w-[180px]" aria-label="Status">
          <option value="">Any status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-outline btn-sm">Filter</button>
      </form>
      <AppointmentTable rows={rows} />
      {rows.length === 200 && <p className="text-xs text-muted">Showing the first 200 — narrow the filters to see more.</p>}
    </div>
  );
}

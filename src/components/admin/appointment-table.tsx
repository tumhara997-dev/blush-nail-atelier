import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatPhone } from "@/lib/phone";
import { formatShortDate, formatTime } from "@/lib/time";
import type { listAppointments } from "@/server/queries";

type Rows = Awaited<ReturnType<typeof listAppointments>>;

export function AppointmentTable({ rows, showDate = true, empty = "Nothing here." }: { rows: Rows; showDate?: boolean; empty?: string }) {
  if (!rows.length) return <p className="card p-5 text-sm text-muted">{empty}</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="table min-w-[640px]">
        <thead>
          <tr>
            <th>{showDate ? "When" : "Time"}</th>
            <th>Customer</th>
            <th>Service</th>
            <th>Artist</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-pale/50">
              <td className="whitespace-nowrap">
                <Link href={`/admin/appointments/${a.id}`} className="font-bold text-rose hover:underline">
                  {showDate && <span className="block text-xs font-normal text-muted">{formatShortDate(a.startsAt)}</span>}
                  {formatTime(a.startsAt)}
                </Link>
              </td>
              <td>
                <div className="font-medium">{a.customerName ?? "—"}</div>
                <a href={`tel:${a.customerPhone}`} className="text-xs text-muted">{formatPhone(a.customerPhone)}</a>
              </td>
              <td>
                {a.items.map((i) => i.name).join(" + ")}
                {a.customerNote && <div className="max-w-[260px] truncate text-xs text-muted" title={a.customerNote}>“{a.customerNote}”</div>}
              </td>
              <td className="whitespace-nowrap">
                {a.staffName && <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: a.staffColor ?? "#c65b86" }} />}
                {a.staffName ?? "—"}
              </td>
              <td><StatusBadge status={a.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

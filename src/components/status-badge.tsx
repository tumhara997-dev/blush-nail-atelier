import { STATUS_LABEL, STATUS_STYLE, type AppointmentStatus } from "@/lib/appointment-status";

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

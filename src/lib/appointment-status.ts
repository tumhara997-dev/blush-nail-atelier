export type AppointmentStatus =
  | "REQUESTED" | "QUOTED" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "EXPIRED";

/** Every allowed status change. Anything not listed is rejected. */
export const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  REQUESTED: ["QUOTED", "CONFIRMED", "CANCELLED", "EXPIRED"],
  QUOTED: ["QUOTED", "CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
  EXPIRED: [],
};

export const ACTIVE_STATUSES: AppointmentStatus[] = ["REQUESTED", "QUOTED", "CONFIRMED", "CHECKED_IN"];

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  REQUESTED: "Awaiting salon",
  QUOTED: "Quote sent",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
  EXPIRED: "Expired",
};

export const STATUS_STYLE: Record<AppointmentStatus, string> = {
  REQUESTED: "bg-amber-100 text-amber-900",
  QUOTED: "bg-violet-100 text-violet-900",
  CONFIRMED: "bg-emerald-100 text-emerald-900",
  CHECKED_IN: "bg-sky-100 text-sky-900",
  COMPLETED: "bg-stone-200 text-stone-800",
  CANCELLED: "bg-rose-100 text-rose-900",
  NO_SHOW: "bg-rose-200 text-rose-950",
  EXPIRED: "bg-stone-100 text-stone-600",
};

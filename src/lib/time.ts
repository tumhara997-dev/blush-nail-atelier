/**
 * Salon time helpers. India has no daylight saving, so IST is a fixed UTC+05:30 offset.
 * All timestamps are stored in UTC; dates/times shown to people are in salon time.
 */
export const SALON_TZ = "Asia/Kolkata";
export const SALON_OFFSET_MIN = 330;

/** "YYYY-MM-DD" for a UTC instant, in salon time. */
export function salonDateString(d: Date = new Date()): string {
  return new Date(d.getTime() + SALON_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/** Minutes since salon-local midnight for a UTC instant. */
export function salonMinutesOfDay(d: Date): number {
  const local = new Date(d.getTime() + SALON_OFFSET_MIN * 60_000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

/** Weekday (0 = Sunday) of a "YYYY-MM-DD" salon date. */
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** UTC instant for a salon-local date + minutes after midnight. */
export function salonDateTimeToUtc(dateStr: string, minutes: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - SALON_OFFSET_MIN * 60_000);
}

/** "HH:mm" → minutes after midnight. */
export function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

/** minutes after midnight → "HH:mm". */
export function minutesToHm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Add whole days to a "YYYY-MM-DD" string. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isValidDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: SALON_TZ, ...opts });
const dateFmt = fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeFmt = fmt({ hour: "numeric", minute: "2-digit", hour12: true });
const shortDateFmt = fmt({ weekday: "short", day: "numeric", month: "short" });

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatShortDate = (d: Date) => shortDateFmt.format(d);
export const formatTime = (d: Date) => timeFmt.format(d).toUpperCase();
export const formatDateTime = (d: Date) => `${formatDate(d)}, ${formatTime(d)}`;

/** "10:30" → "10:30 AM" */
export function formatHm(hm: string): string {
  const min = hmToMinutes(hm);
  const h = Math.floor(min / 60);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(min % 60).padStart(2, "0")} ${suffix}`;
}

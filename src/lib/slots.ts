import { minutesToHm, salonDateTimeToUtc } from "./time";

export type Interval = { start: number; end: number }; // epoch ms, half-open [start, end)

export type SlotInput = {
  date: string; // salon-local YYYY-MM-DD
  openMin: number; // minutes after midnight
  closeMin: number;
  durationMin: number; // service time
  bufferMin: number; // cleanup after service
  stepMin: number;
  earliestStart: Date; // now + lead time (or now for admin)
  staff: { id: string; busy: Interval[] }[];
};

export type Slot = { time: string; startsAt: string; staffIds: string[] };

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/**
 * Pure slot calculation — no DB access, fully unit-tested.
 * A slot is offered when the service finishes before closing time and at least one
 * technician is free for service + buffer.
 */
export function computeSlots(input: SlotInput): Slot[] {
  const { date, openMin, closeMin, durationMin, bufferMin, stepMin, earliestStart, staff } = input;
  const slots: Slot[] = [];
  if (durationMin <= 0 || stepMin <= 0) return slots;

  for (let t = openMin; t + durationMin <= closeMin; t += stepMin) {
    const start = salonDateTimeToUtc(date, t).getTime();
    if (start < earliestStart.getTime()) continue;
    const block: Interval = { start, end: start + (durationMin + bufferMin) * 60_000 };
    const free = staff.filter((s) => !s.busy.some((b) => overlaps(block, b))).map((s) => s.id);
    if (free.length) slots.push({ time: minutesToHm(t), startsAt: new Date(start).toISOString(), staffIds: free });
  }
  return slots;
}

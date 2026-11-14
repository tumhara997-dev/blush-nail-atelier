import { describe, expect, it } from "vitest";
import { computeSlots } from "@/lib/slots";
import { salonDateTimeToUtc } from "@/lib/time";

const D = "2026-12-01"; // a Tuesday
const at = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return salonDateTimeToUtc(D, h * 60 + m).getTime();
};
const base = {
  date: D,
  openMin: 10 * 60,
  closeMin: 19 * 60,
  durationMin: 60,
  bufferMin: 15,
  stepMin: 30,
  earliestStart: new Date(0),
};

describe("computeSlots", () => {
  it("offers every step that finishes before closing", () => {
    const slots = computeSlots({ ...base, staff: [{ id: "a", busy: [] }] });
    expect(slots[0].time).toBe("10:00");
    expect(slots.at(-1)!.time).toBe("18:00"); // 18:00 + 60 = 19:00 close; buffer may run past close
    expect(slots).toHaveLength(17);
  });

  it("blocks overlaps including the cleanup buffer", () => {
    // Existing booking 12:00–13:15 (60 min + 15 buffer)
    const busy = [{ start: at("12:00"), end: at("13:15") }];
    const times = computeSlots({ ...base, staff: [{ id: "a", busy }] }).map((s) => s.time);
    expect(times).not.toContain("11:00"); // 11:00–12:15 block would overlap 12:00
    expect(times).toContain("10:30"); // 10:30–11:45 is fine
    expect(times).not.toContain("12:30");
    expect(times).not.toContain("13:00"); // overlaps buffer until 13:15
    expect(times).toContain("13:30");
  });

  it("uses any free technician and reports which ones", () => {
    const busy = [{ start: at("10:00"), end: at("11:15") }];
    const slots = computeSlots({ ...base, staff: [{ id: "a", busy }, { id: "b", busy: [] }] });
    expect(slots.find((s) => s.time === "10:00")!.staffIds).toEqual(["b"]);
    expect(slots.find((s) => s.time === "11:30")!.staffIds).toEqual(["a", "b"]);
  });

  it("respects the earliest bookable time", () => {
    const slots = computeSlots({ ...base, earliestStart: new Date(at("14:10")), staff: [{ id: "a", busy: [] }] });
    expect(slots[0].time).toBe("14:30");
  });

  it("returns nothing when a long service cannot fit", () => {
    expect(computeSlots({ ...base, durationMin: 600, staff: [{ id: "a", busy: [] }] })).toEqual([]);
  });

  it("stores slot start times in UTC (IST is UTC+5:30)", () => {
    const [first] = computeSlots({ ...base, staff: [{ id: "a", busy: [] }] });
    expect(first.startsAt).toBe("2026-12-01T04:30:00.000Z");
  });
});

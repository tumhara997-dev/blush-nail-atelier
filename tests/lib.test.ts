import { describe, expect, it } from "vitest";
import { normalizeIndianMobile, whatsappLink } from "@/lib/phone";
import { addDays, formatHm, salonDateString, salonMinutesOfDay, weekdayOf } from "@/lib/time";
import { canTransition } from "@/lib/appointment-status";
import { estimate } from "@/lib/pricing";
import { rupeesToPaise } from "@/lib/money";
import { newBookingRef } from "@/lib/ref";

describe("phone", () => {
  it.each([
    ["98123 45678", "+919812345678"],
    ["+91 98123-45678", "+919812345678"],
    ["09812345678", "+919812345678"],
    ["919812345678", "+919812345678"],
  ])("normalises %s", (input, out) => expect(normalizeIndianMobile(input)).toBe(out));

  it.each(["----------", "12345", "5812345678", "+1 415 555 0100", ""])("rejects %s", (bad) => expect(normalizeIndianMobile(bad)).toBeNull());

  it("builds WhatsApp links", () => expect(whatsappLink("+919812345678", "hi there")).toBe("https://wa.me/919812345678?text=hi%20there"));
});

describe("time (IST)", () => {
  it("uses the salon's date, not UTC — fixes the demo's 'yesterday' bug", () => {
    // 2026-11-15 01:00 IST = 2026-11-14 19:30 UTC
    expect(salonDateString(new Date("2026-11-14T19:30:00Z"))).toBe("2026-11-15");
  });
  it("minutes of day", () => expect(salonMinutesOfDay(new Date("2026-11-15T04:30:00Z"))).toBe(600));
  it("weekday", () => expect(weekdayOf("2026-11-15")).toBe(0)); // Sunday
  it("addDays crosses months", () => expect(addDays("2026-11-30", 1)).toBe("2026-12-01"));
  it("formats 24h to 12h", () => {
    expect(formatHm("00:30")).toBe("12:30 AM");
    expect(formatHm("12:00")).toBe("12:00 PM");
    expect(formatHm("17:45")).toBe("5:45 PM");
  });
});

describe("appointment status rules", () => {
  it("allows the normal flow", () => {
    expect(canTransition("REQUESTED", "QUOTED")).toBe(true);
    expect(canTransition("QUOTED", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "CHECKED_IN")).toBe(true);
    expect(canTransition("CHECKED_IN", "COMPLETED")).toBe(true);
  });
  it("rejects illegal moves", () => {
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("REQUESTED", "COMPLETED")).toBe(false);
  });
});

describe("pricing", () => {
  const svc = { priceType: "FROM" as const, basePrice: 49900, durationMin: 120 };
  it("variant + add-ons give an exact price and duration", () => {
    expect(estimate(svc, { price: 69900, durationMin: 135 }, [{ price: 20000, durationMin: 20 }])).toEqual({ durationMin: 155, price: 89900, fromPrice: null });
  });
  it("'from' price without variant", () => expect(estimate(svc, null, [])).toEqual({ durationMin: 120, price: null, fromPrice: 49900 }));
  it("on-enquiry has no price", () => expect(estimate({ priceType: "ON_ENQUIRY", basePrice: null, durationMin: 60 }, null, []).price).toBeNull());
  it("parses rupee input", () => {
    expect(rupeesToPaise("1,250")).toBe(125000);
    expect(rupeesToPaise("₹ 499.50")).toBe(49950);
    expect(rupeesToPaise("")).toBeNull();
    expect(rupeesToPaise("-5")).toBeNull();
  });
});

describe("booking ref", () => {
  it("is readable and unambiguous", () => {
    for (let i = 0; i < 50; i++) expect(newBookingRef()).toMatch(/^BL-[2-9A-HJKMNP-Z]{5}$/);
  });
});

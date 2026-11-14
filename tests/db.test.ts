import { beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { isOverlapError } from "@/db";

// Runs the real migrations against an in-memory Postgres and checks the booking guarantees.
const client = new PGlite({ extensions: { btree_gist } });
const db = drizzle(client, { schema });
let customerId = "";
let staffA = "";
let staffB = "";

const t = (hm: string) => new Date(`2026-12-01T${hm}:00+05:30`);
const appt = (staffId: string, from: string, to: string, status: (typeof schema.appointmentStatusEnum.enumValues)[number] = "CONFIRMED") =>
  db.insert(schema.appointments).values({ ref: `BL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, customerId, staffId, status, startsAt: t(from), endsAt: t(to) });

beforeAll(async () => {
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../drizzle") });
  [{ id: customerId }] = await db.insert(schema.users).values({ phone: "+919800000001", name: "T" }).returning();
  [{ id: staffA }, { id: staffB }] = await db.insert(schema.staff).values([{ displayName: "A" }, { displayName: "B" }]).returning();
});

describe("double-booking protection (database constraint)", () => {
  it("rejects an overlapping booking for the same artist", async () => {
    await appt(staffA, "11:00", "13:15");
    const err = await appt(staffA, "12:00", "13:00").then(() => null, (e) => e);
    expect(err).not.toBeNull();
    expect(isOverlapError(err)).toBe(true);
  });

  it("allows back-to-back bookings and other artists", async () => {
    await expect(appt(staffA, "13:15", "14:00")).resolves.toBeDefined(); // [) ranges: touching is fine
    await expect(appt(staffB, "11:00", "13:15")).resolves.toBeDefined();
  });

  it("ignores cancelled bookings so the slot can be re-used", async () => {
    await appt(staffA, "16:00", "17:00", "CANCELLED");
    await expect(appt(staffA, "16:00", "17:00")).resolves.toBeDefined();
  });

  it("rejects an end time before the start time", async () => {
    await expect(appt(staffB, "18:00", "17:00")).rejects.toBeDefined();
  });
});

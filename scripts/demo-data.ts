/**
 * Sample data for showing the admin panel to clients.
 *
 *   npx tsx scripts/demo-data.ts
 *
 * Writes:
 *  - netlify/database/migrations/<timestamp>_demo_data.sql   (applied by the next Netlify deploy)
 *  - scripts/remove-demo-data.sql                             (copy into migrations with a newer timestamp to remove it all)
 *
 * Dates are relative to when the migration runs (IST). Every demo customer's staff_notes starts with "[DEMO]",
 * and the app never sends WhatsApp/SMS to them. Phone numbers use the reserved +91 90000 xxxxx range.
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { FIRST_STAFF, SERVICES, stableId } from "../src/db/seed-content";

const DEMO = "[DEMO]";
const OUT = path.resolve("netlify/database/migrations");
const q = (v: string | null) => (v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`);
const svc = (slug: string) => {
  const s = SERVICES.find((x) => x.slug === slug);
  if (!s) throw new Error(`unknown service ${slug}`);
  return s;
};
/** IST wall-clock time `dayOffset` days from today, as timestamptz. */
const at = (dayOffset: number, hm: string, plusMin = 0) =>
  `(((now() AT TIME ZONE 'Asia/Kolkata')::date + ${dayOffset} + time '${hm}') AT TIME ZONE 'Asia/Kolkata' + interval '${plusMin} minutes')`;

const CUSTOMERS = [
  { key: "ananya", name: "Ananya Sharma", prefs: "Almond, medium length, nude & gold", allergies: null, joinedDaysAgo: 60 },
  { key: "priya", name: "Priya Verma", prefs: "Coffin shape, chrome finishes", allergies: null, joinedDaysAgo: 45 },
  { key: "simran", name: "Simran Kaur", prefs: "Short square, classic reds", allergies: null, joinedDaysAgo: 40 },
  { key: "meera", name: "Meera Iyer", prefs: "Soft gel, pastel French", allergies: "Sensitive cuticles", joinedDaysAgo: 30 },
  { key: "kavya", name: "Kavya Reddy", prefs: "Long almond, 3D art", allergies: null, joinedDaysAgo: 25 },
  { key: "ishita", name: "Ishita Mehta", prefs: "Oval, glossy nude", allergies: null, joinedDaysAgo: 20 },
  { key: "zoya", name: "Zoya Khan", prefs: "Stiletto, black & gold", allergies: null, joinedDaysAgo: 14 },
  { key: "neha", name: "Neha Gupta", prefs: "Medium square, ombré", allergies: "Acetone sensitivity", joinedDaysAgo: 10 },
  { key: "riddhi", name: "Riddhi Desai", prefs: "Short natural, gel polish", allergies: null, joinedDaysAgo: 7 },
  { key: "tanvi", name: "Tanvi Joshi", prefs: "Bridal — wedding 6 Dec, red & gold lehenga", allergies: null, joinedDaysAgo: 3 },
].map((c, i) => ({ ...c, id: stableId(`demo:user:${c.key}`), phone: `+9190000${String(10001 + i).padStart(5, "0")}` }));
const cust = (k: string) => CUSTOMERS.find((c) => c.key === k)!;

const DEMO_ARTIST = { id: stableId("demo:staff:riya"), displayName: "Riya", color: "#b08d57" };
const A = FIRST_STAFF.id;
const B = DEMO_ARTIST.id;

type Status = "REQUESTED" | "QUOTED" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
type Appt = { day: number; time: string; staff: string; c: string; svc: string; status: Status; price?: number; note?: string; source?: string; cancelReason?: string };

// Past history, earlier today, and the coming week. No overlaps per artist.
const APPTS: Appt[] = [
  { day: -9, time: "11:00", staff: A, c: "ananya", svc: "gel-extensions", status: "COMPLETED", price: 89900 },
  { day: -8, time: "14:00", staff: B, c: "priya", svc: "custom-nail-art", status: "COMPLETED", price: 125000, note: "Chrome cat-eye on all ten" },
  { day: -7, time: "12:00", staff: A, c: "simran", svc: "gel-polish", status: "COMPLETED", price: 59900, source: "WALK_IN" },
  { day: -6, time: "16:00", staff: A, c: "meera", svc: "acrylic-extensions", status: "NO_SHOW" },
  { day: -5, time: "11:00", staff: B, c: "kavya", svc: "refill-repair", status: "COMPLETED", price: 49900 },
  { day: -4, time: "13:00", staff: A, c: "ishita", svc: "soft-gel-extensions", status: "COMPLETED", price: 149900, source: "INSTAGRAM" },
  { day: -3, time: "10:00", staff: B, c: "zoya", svc: "nail-removal", status: "COMPLETED", price: 29900 },
  { day: -2, time: "15:00", staff: A, c: "neha", svc: "gel-extensions", status: "CANCELLED", cancelReason: "Rescheduling — travelling" },
  { day: -1, time: "12:00", staff: B, c: "riddhi", svc: "gel-polish", status: "COMPLETED", price: 59900, source: "WHATSAPP" },
  { day: 0, time: "10:00", staff: A, c: "ananya", svc: "refill-repair", status: "COMPLETED", price: 49900 },
  { day: 0, time: "11:30", staff: B, c: "simran", svc: "gel-polish", status: "COMPLETED", price: 59900 },
  { day: 1, time: "10:30", staff: A, c: "priya", svc: "acrylic-extensions", status: "CONFIRMED", note: "Coffin, long — milky white" },
  { day: 1, time: "13:00", staff: B, c: "tanvi", svc: "custom-nail-art", status: "REQUESTED", note: "Bridal nails to match mehendi & a red-gold lehenga. Wedding on 6 Dec." },
  { day: 1, time: "15:30", staff: A, c: "neha", svc: "gel-extensions", status: "CONFIRMED", source: "WHATSAPP" },
  { day: 2, time: "11:00", staff: B, c: "meera", svc: "soft-gel-extensions", status: "QUOTED", price: 139900, note: "Pastel French with tiny pearls" },
  { day: 2, time: "14:00", staff: A, c: "kavya", svc: "temporary-nails", status: "REQUESTED", note: "Press-ons for a sangeet — sparkly silver" },
  { day: 3, time: "12:00", staff: A, c: "ishita", svc: "gel-polish", status: "CONFIRMED" },
  { day: 3, time: "15:00", staff: B, c: "zoya", svc: "custom-nail-art", status: "QUOTED", price: 99900, note: "Black & gold Diwali design" },
  { day: 4, time: "11:00", staff: A, c: "riddhi", svc: "gel-extensions", status: "CONFIRMED", source: "INSTAGRAM" },
  { day: 5, time: "10:00", staff: B, c: "ananya", svc: "custom-nail-art", status: "CONFIRMED", price: 135000, note: "Gold foil & stones for a reception" },
  { day: 6, time: "14:30", staff: A, c: "simran", svc: "refill-repair", status: "CONFIRMED" },
];

const sql: string[] = [
  `-- Demo data for showing the admin panel (generated by scripts/demo-data.ts). Remove before real launch: scripts/remove-demo-data.sql`,
  `INSERT INTO "staff" ("id", "display_name", "calendar_color", "sort_order") VALUES (${q(DEMO_ARTIST.id)}, ${q(DEMO_ARTIST.displayName)}, ${q(DEMO_ARTIST.color)}, 1) ON CONFLICT DO NOTHING;`,
  `INSERT INTO "users" ("id", "role", "name", "phone", "nail_prefs", "allergies", "staff_notes", "created_at") VALUES\n` +
    CUSTOMERS.map((c) => `  (${q(c.id)}, 'CUSTOMER', ${q(c.name)}, ${q(c.phone)}, ${q(c.prefs)}, ${q(c.allergies)}, ${q(`${DEMO} Sample customer for demos`)}, now() - interval '${c.joinedDaysAgo} days')`).join(",\n") +
    `\nON CONFLICT DO NOTHING;`,
];

APPTS.forEach((a, i) => {
  const s = svc(a.svc);
  const id = stableId(`demo:appt:${i}`);
  const ref = `BL-D${String(i + 1).padStart(4, "0")}`;
  const total = s.durationMin + s.bufferMin;
  const exact = a.price ?? (s.priceType !== "ON_ENQUIRY" ? s.basePrice : null);
  const quoted = a.status === "QUOTED" || (a.price && s.bookingMode === "REQUEST") ? a.price ?? null : null;
  const final = a.status === "COMPLETED" ? exact : null;
  const t = (col: string, cond: boolean, val: string) => (cond ? `, "${col}"` : "") + "|" + (cond ? `, ${val}` : "");
  const extra = [
    t("confirmed_at", ["CONFIRMED", "CHECKED_IN", "COMPLETED", "NO_SHOW"].includes(a.status), `${at(a.day, a.time, -2880)}`),
    t("completed_at", a.status === "COMPLETED", at(a.day, a.time, total)),
    t("cancelled_at", a.status === "CANCELLED", at(a.day, a.time, -1440)),
    t("cancel_reason", a.status === "CANCELLED", q(a.cancelReason ?? null)),
    t("cancelled_by", a.status === "CANCELLED", "'CUSTOMER'"),
    t("quote_expires_at", a.status === "QUOTED", "now() + interval '7 days'"),
    // Mark reminders as handled so the reminder job never touches demo bookings.
    t("reminder_24h_at", true, "now()"),
  ];
  const cols = extra.map((e) => e.split("|")[0]).join("");
  const vals = extra.map((e) => e.split("|")[1]).join("");
  sql.push(
    `INSERT INTO "appointments" ("id", "ref", "customer_id", "staff_id", "status", "source", "starts_at", "ends_at", "customer_note", "estimate_min", "estimate_max", "quoted_total", "final_total", "created_at"${cols}) VALUES ` +
      `(${q(id)}, ${q(ref)}, ${q(cust(a.c).id)}, ${q(a.staff)}, '${a.status}', '${a.source ?? "WEB"}', ${at(a.day, a.time)}, ${at(a.day, a.time, total)}, ${q(a.note ?? null)}, ${exact ?? s.basePrice ?? "NULL"}, ${exact ?? "NULL"}, ${quoted ?? "NULL"}, ${final ?? "NULL"}, ${at(a.day, a.time, -4320)}${vals}) ON CONFLICT DO NOTHING;`,
    `INSERT INTO "appointment_items" ("id", "appointment_id", "service_id", "name", "price", "duration_min") VALUES (${q(stableId(`demo:item:${i}`))}, ${q(id)}, ${q(s.id)}, ${q(s.name)}, ${exact ?? "NULL"}, ${s.durationMin}) ON CONFLICT DO NOTHING;`,
    `INSERT INTO "appointment_events" ("id", "appointment_id", "from_status", "to_status", "note", "created_at") VALUES (${q(stableId(`demo:event:${i}`))}, ${q(id)}, NULL, '${a.status === "QUOTED" || a.status === "REQUESTED" ? "REQUESTED" : "CONFIRMED"}', ${q(`Booked via ${(a.source ?? "WEB").toLowerCase().replace("_", "-")}`)}, ${at(a.day, a.time, -4320)}) ON CONFLICT DO NOTHING;`,
  );
  if (!["REQUESTED", "CONFIRMED"].includes(a.status) && a.status !== "QUOTED") {
    sql.push(`INSERT INTO "appointment_events" ("id", "appointment_id", "from_status", "to_status", "note", "created_at") VALUES (${q(stableId(`demo:event2:${i}`))}, ${q(id)}, 'CONFIRMED', '${a.status}', ${q(a.cancelReason ?? null)}, ${at(a.day, a.time, total)}) ON CONFLICT DO NOTHING;`);
  }
  if (a.status === "QUOTED") {
    sql.push(`INSERT INTO "appointment_events" ("id", "appointment_id", "from_status", "to_status", "note", "created_at") VALUES (${q(stableId(`demo:event2:${i}`))}, ${q(id)}, 'REQUESTED', 'QUOTED', NULL, now() - interval '3 hours') ON CONFLICT DO NOTHING;`);
  }
});

const ENQUIRIES = [
  { name: "Aditi Rao", msg: "Hi! Do you do bridal trials on weekends? My wedding is in January.", hoursAgo: 3 },
  { name: "Sana Sheikh", msg: "What's the price for medium-length gel extensions with simple French?", hoursAgo: 20 },
  { name: "Pooja Nair", msg: "Can I book for 4 people together for a sangeet on the 28th?", hoursAgo: 40 },
];
sql.push(
  `INSERT INTO "enquiries" ("id", "name", "phone", "message", "status", "consent_at", "created_at") VALUES\n` +
    ENQUIRIES.map((e, i) => `  (${q(stableId(`demo:enquiry:${i}`))}, ${q(e.name)}, ${q(`+9190000${String(20001 + i)}`)}, ${q(e.msg)}, 'NEW', now() - interval '${e.hoursAgo} hours', now() - interval '${e.hoursAgo} hours')`).join(",\n") +
    `\nON CONFLICT DO NOTHING;`,
);

// ── write files ──
if (readdirSync(OUT).some((f) => f.endsWith("_demo_data.sql"))) {
  console.log("demo_data migration already exists — not regenerating (applied migrations must never change).");
} else {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  writeFileSync(path.join(OUT, `${stamp}_demo_data.sql`), sql.join("\n\n") + "\n");
  console.log(`+ ${stamp}_demo_data.sql`);
}

const removal = `-- Removes ALL demo data added by *_demo_data.sql.
-- To use: copy this file to netlify/database/migrations/<new timestamp>_remove_demo_data.sql and deploy.
DELETE FROM "appointments" WHERE "customer_id" IN (SELECT "id" FROM "users" WHERE "staff_notes" LIKE '${DEMO}%');
DELETE FROM "otp_codes" WHERE "phone" IN (SELECT "phone" FROM "users" WHERE "staff_notes" LIKE '${DEMO}%');
DELETE FROM "users" WHERE "staff_notes" LIKE '${DEMO}%';
DELETE FROM "enquiries" WHERE "id" IN (${ENQUIRIES.map((_, i) => q(stableId(`demo:enquiry:${i}`))).join(", ")});
UPDATE "appointments" SET "staff_id" = NULL WHERE "staff_id" = ${q(DEMO_ARTIST.id)};
DELETE FROM "staff" WHERE "id" = ${q(DEMO_ARTIST.id)};
`;
if (!existsSync("scripts/remove-demo-data.sql")) writeFileSync("scripts/remove-demo-data.sql", removal);
console.log("✔ scripts/remove-demo-data.sql");

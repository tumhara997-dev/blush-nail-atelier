import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { and, eq, gte, isNull, lt, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { transition } from "@/server/appointments";
import { notifyAppointment } from "@/server/notifications";

/**
 * Scheduled jobs. Call with header `Authorization: Bearer $CRON_SECRET`:
 *   GET /api/cron/reminders  — hourly: WhatsApp reminder ~24h before confirmed appointments
 *   GET /api/cron/expire     — every 15 min: expire unanswered quotes and requests whose time has passed
 * On Vercel these are wired up in vercel.json.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret === "change-me") return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { job } = await params;
  const A = schema.appointments;
  const now = new Date();

  if (job === "reminders") {
    const due = await db()
      .select({ id: A.id })
      .from(A)
      .where(and(eq(A.status, "CONFIRMED"), isNull(A.reminder24hAt), gte(A.startsAt, new Date(now.getTime() + 2 * 3_600_000)), lt(A.startsAt, new Date(now.getTime() + 26 * 3_600_000))));
    for (const { id } of due) {
      // Mark first so an overlapping run can't double-send.
      const claimed = await db().update(A).set({ reminder24hAt: now }).where(and(eq(A.id, id), isNull(A.reminder24hAt))).returning({ id: A.id });
      if (claimed.length) await notifyAppointment(id, "reminder_24h");
    }
    return NextResponse.json({ job, sent: due.length });
  }

  if (job === "expire") {
    const stale = await db()
      .select({ id: A.id, status: A.status })
      .from(A)
      .where(or(and(eq(A.status, "QUOTED"), lt(A.quoteExpiresAt, now)), and(or(eq(A.status, "REQUESTED"), eq(A.status, "QUOTED")), lt(A.startsAt, now))));
    let expired = 0;
    for (const s of stale) {
      const r = await transition(s.id, "EXPIRED", null, { note: s.status === "QUOTED" ? "Quote not accepted in time" : "Request not handled before appointment time" });
      if (r.ok) expired++;
    }
    return NextResponse.json({ job, expired });
  }

  return NextResponse.json({ error: "Unknown job" }, { status: 404 });
}

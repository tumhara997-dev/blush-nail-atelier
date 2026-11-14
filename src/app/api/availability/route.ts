import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSelection } from "@/server/catalog";
import { getDayAvailability } from "@/server/availability";
import { estimate } from "@/lib/pricing";
import { isValidDateString } from "@/lib/time";
import { rateLimited } from "@/server/rate-limit";

const query = z.object({
  serviceId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  addOnIds: z.string().optional(),
  date: z.string().refine(isValidDateString, "Invalid date"),
});

/** GET /api/availability?serviceId=&variantId=&addOnIds=a,b&date=YYYY-MM-DD → free start times for that day. */
export async function GET(req: Request) {
  if (await rateLimited("availability", 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = query.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { serviceId, variantId, addOnIds, date } = parsed.data;
  const ids = addOnIds ? addOnIds.split(",").filter(Boolean) : [];
  if (!ids.every((id) => z.string().uuid().safeParse(id).success)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const sel = await resolveSelection(serviceId, variantId ?? null, ids);
  if (!sel) return NextResponse.json({ error: "Please choose valid options" }, { status: 400 });

  const est = estimate(sel.service, sel.variant, sel.addOns);
  const day = await getDayAvailability({ serviceId, durationMin: est.durationMin, bufferMin: sel.service.bufferMin, date });
  return NextResponse.json(
    { date, closed: day.closed, durationMin: est.durationMin, slots: day.slots.map((s) => s.time) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { siteUrl } from "@/lib/site-url";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatPaise } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/time";
import { sendWhatsAppTemplate, whatsappConfigured } from "./integrations/whatsapp";
import { getSettings } from "./settings";

export type Template =
  | "booking_requested"
  | "booking_confirmed"
  | "quote_ready"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "reminder_24h"
  | "staff_new_booking";

type Appt = typeof schema.appointments.$inferSelect;

/** Prefix on users.staff_notes that marks sample/demo customers (see scripts/demo-data.ts). */
export const DEMO_MARK = "[DEMO]";

/** Message text (for logs/console) and the ordered template variables (for WhatsApp). */
function render(template: Template, a: Appt, ctx: { name: string; service: string; salon: string; site: string }) {
  const when = `${formatDate(a.startsAt)} at ${formatTime(a.startsAt)}`;
  const link = `${ctx.site}/account/appointments/${a.ref}`;
  switch (template) {
    case "booking_requested":
      return { params: [ctx.name, ctx.service, when, a.ref], text: `Hi ${ctx.name}, we've received your request for ${ctx.service} on ${when} (ref ${a.ref}). ${ctx.salon} will confirm shortly.` };
    case "booking_confirmed":
      return { params: [ctx.name, ctx.service, when, a.ref], text: `Hi ${ctx.name}, your ${ctx.service} appointment on ${when} is confirmed (ref ${a.ref}). See you at ${ctx.salon}! 💅` };
    case "quote_ready": {
      const price = a.quotedTotal != null ? formatPaise(a.quotedTotal) : "";
      return { params: [ctx.name, ctx.service, price, link], text: `Hi ${ctx.name}, your quote for ${ctx.service} is ${price}. Accept it here: ${link}` };
    }
    case "booking_cancelled":
      return { params: [ctx.name, ctx.service, when, a.ref], text: `Hi ${ctx.name}, your ${ctx.service} appointment on ${when} (ref ${a.ref}) has been cancelled.` };
    case "booking_rescheduled":
      return { params: [ctx.name, ctx.service, when, a.ref], text: `Hi ${ctx.name}, your ${ctx.service} appointment has moved to ${when} (ref ${a.ref}).` };
    case "reminder_24h":
      return { params: [ctx.name, ctx.service, when], text: `Reminder: ${ctx.service} at ${ctx.salon} tomorrow — ${when}. Need to change it? Message us on WhatsApp.` };
    case "staff_new_booking":
      return { params: [ctx.name, ctx.service, when, a.ref], text: `New booking: ${ctx.name} — ${ctx.service} on ${when} (${a.ref}, ${a.status}).` };
  }
}

async function deliver(opts: { userId: string | null; to: string; template: Template; params: string[]; text: string }) {
  const useWa = whatsappConfigured();
  const [row] = await db()
    .insert(schema.notifications)
    .values({ userId: opts.userId, to: opts.to, channel: useWa ? "WHATSAPP" : "CONSOLE", template: opts.template, body: opts.text })
    .returning({ id: schema.notifications.id });
  try {
    let providerMsgId: string | null = null;
    if (useWa) providerMsgId = await sendWhatsAppTemplate(opts.to, opts.template, opts.params);
    else console.log(`[notify → ${opts.to}] (${opts.template}) ${opts.text}`);
    await db().update(schema.notifications).set({ status: "SENT", sentAt: new Date(), providerMsgId }).where(eq(schema.notifications.id, row.id));
  } catch (e) {
    console.error("Notification failed", opts.template, e);
    await db().update(schema.notifications).set({ status: "FAILED", error: String((e as Error).message ?? e) }).where(eq(schema.notifications.id, row.id));
  }
}

/** Send a customer message about an appointment (+ optional alert to the salon). Never throws. */
export async function notifyAppointment(appointmentId: string, template: Template, alsoAlertSalon = false) {
  try {
    const d = db();
    const [row] = await d
      .select({ a: schema.appointments, u: schema.users })
      .from(schema.appointments)
      .innerJoin(schema.users, eq(schema.users.id, schema.appointments.customerId))
      .where(eq(schema.appointments.id, appointmentId));
    if (!row) return;
    const items = await d.select({ name: schema.appointmentItems.name }).from(schema.appointmentItems).where(eq(schema.appointmentItems.appointmentId, appointmentId));
    const { salon } = await getSettings("salon");
    const ctx = {
      name: row.u.name ?? "there",
      service: items.map((i) => i.name).join(" + ") || "your appointment",
      salon: salon.name,
      site: siteUrl(),
    };
    // Demo customers (sample data for showing the admin) never receive real messages.
    const isDemo = row.u.staffNotes?.startsWith(DEMO_MARK) ?? false;
    if (!row.u.deletedAt && !isDemo) {
      const msg = render(template, row.a, ctx);
      await deliver({ userId: row.u.id, to: row.u.phone, template, ...msg });
    }
    const salonPhone = salon.whatsapp || process.env.OWNER_PHONE;
    if (alsoAlertSalon && salonPhone && !isDemo) {
      const msg = render("staff_new_booking", row.a, ctx);
      await deliver({ userId: null, to: salonPhone, template: "staff_new_booking", ...msg });
    }
  } catch (e) {
    console.error("notifyAppointment failed", e);
  }
}

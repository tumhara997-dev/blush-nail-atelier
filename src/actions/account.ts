"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { destroyAllSessions, requireUser } from "@/server/auth";
import { transition } from "@/server/appointments";
import { getSettings } from "@/server/settings";
import { deleteMedia } from "@/server/media";

export type ActionState = { ok?: boolean; error?: string; message?: string };

async function ownAppointment(userId: string, ref: string) {
  const [a] = await db().select().from(schema.appointments).where(and(eq(schema.appointments.customerId, userId), eq(schema.appointments.ref, ref))).limit(1);
  return a ?? null;
}

export async function cancelMyAppointment(ref: string, reason: string): Promise<ActionState> {
  const user = await requireUser();
  const a = await ownAppointment(user.id, ref);
  if (!a) return { error: "Appointment not found." };
  if (!["REQUESTED", "QUOTED", "CONFIRMED"].includes(a.status)) return { error: "This appointment can't be cancelled." };
  if (a.status === "CONFIRMED") {
    const { booking } = await getSettings("booking");
    const hoursLeft = (a.startsAt.getTime() - Date.now()) / 3_600_000;
    if (hoursLeft < booking.cancelWindowHours) {
      return { error: `Online cancellation closes ${booking.cancelWindowHours} hours before. Please message us on WhatsApp.` };
    }
  }
  const res = await transition(a.id, "CANCELLED", { id: user.id, role: user.role }, { cancelReason: reason.trim().slice(0, 300) || "Cancelled by customer" });
  if (!res.ok) return { error: res.error };
  revalidatePath(`/account/appointments/${ref}`);
  return { ok: true, message: "Your appointment has been cancelled." };
}

export async function respondToQuote(ref: string, accept: boolean): Promise<ActionState> {
  const user = await requireUser();
  const a = await ownAppointment(user.id, ref);
  if (!a || a.status !== "QUOTED") return { error: "This quote is no longer open." };
  if (accept && a.quoteExpiresAt && a.quoteExpiresAt < new Date()) return { error: "This quote has expired. Please message us for a new one." };
  const res = await transition(a.id, accept ? "CONFIRMED" : "CANCELLED", { id: user.id, role: user.role }, accept ? { note: "Quote accepted by customer" } : { cancelReason: "Quote declined by customer" });
  if (!res.ok) return { error: res.error };
  revalidatePath(`/account/appointments/${ref}`);
  return { ok: true, message: accept ? "Confirmed! See you soon." : "Quote declined." };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.union([z.literal(""), z.string().trim().email("Please enter a valid email")]),
  nailPrefs: z.string().trim().max(500),
  allergies: z.string().trim().max(500),
  marketingOptIn: z.boolean(),
});

export async function updateProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: form.get("name") ?? "",
    email: form.get("email") ?? "",
    nailPrefs: form.get("nailPrefs") ?? "",
    allergies: form.get("allergies") ?? "",
    marketingOptIn: form.get("marketingOptIn") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const p = parsed.data;
  await db()
    .update(schema.users)
    .set({ name: p.name, email: p.email || null, nailPrefs: p.nailPrefs || null, allergies: p.allergies || null, marketingOptIn: p.marketingOptIn, updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));
  if (p.marketingOptIn !== user.marketingOptIn) {
    const { policies } = await getSettings("policies");
    await db().insert(schema.consents).values({ userId: user.id, purpose: "MARKETING_WHATSAPP", granted: p.marketingOptIn, version: policies.version });
  }
  revalidatePath("/account/profile");
  return { ok: true, message: "Saved." };
}

/** DPDP: erase personal data. Appointment rows stay (business records) but are no longer linked to a person. */
export async function deleteMyAccount(form: FormData) {
  const user = await requireUser();
  if (form.get("confirm") !== "DELETE") redirect("/account/profile?error=confirm");
  if (user.role !== "CUSTOMER") redirect("/account/profile?error=staff");
  const now = new Date();
  // Cancel future bookings first so slots free up and the salon is told.
  const upcoming = await db().select().from(schema.appointments).where(eq(schema.appointments.customerId, user.id));
  for (const a of upcoming) {
    if (["REQUESTED", "QUOTED", "CONFIRMED"].includes(a.status) && a.startsAt > now) {
      await transition(a.id, "CANCELLED", { id: user.id, role: user.role }, { cancelReason: "Account deleted" });
    }
  }
  await deleteMedia(await db().select({ id: schema.media.id }).from(schema.media).where(eq(schema.media.ownerId, user.id)));
  await db()
    .update(schema.users)
    .set({ name: null, email: null, phone: `deleted:${user.id}`, nailPrefs: null, allergies: null, staffNotes: null, marketingOptIn: false, deletedAt: now, updatedAt: now })
    .where(eq(schema.users.id, user.id));
  await destroyAllSessions(user.id);
  redirect("/?account=deleted");
}

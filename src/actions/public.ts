"use server";

import { z } from "zod";
import { db, schema } from "@/db";
import { normalizeIndianMobile } from "@/lib/phone";
import { rateLimited } from "@/server/rate-limit";

export type FormState = { ok?: boolean; error?: string; message?: string };

const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().max(20),
  message: z.string().trim().min(5, "Please write a short message").max(1500),
  consent: z.literal("on", { errorMap: () => ({ message: "Please agree to the privacy policy" }) }),
  website: z.string().max(0).optional(), // honeypot — real users never fill this
});

export async function submitEnquiry(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = enquirySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  if (parsed.data.website) return { ok: true, message: "Thanks! We'll get back to you soon." }; // silently drop bots
  const phone = normalizeIndianMobile(parsed.data.phone);
  if (!phone) return { error: "Please enter a valid 10-digit Indian mobile number." };
  if (await rateLimited("enquiry", 5, 60 * 60_000)) return { error: "Too many messages. Please try again later or WhatsApp us." };

  await db().insert(schema.enquiries).values({ name: parsed.data.name, phone, message: parsed.data.message, consentAt: new Date() });
  return { ok: true, message: "Thanks! We'll get back to you on WhatsApp or a call soon." };
}

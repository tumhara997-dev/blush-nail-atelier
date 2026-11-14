"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { normalizeIndianMobile } from "@/lib/phone";
import { destroySession, getCurrentUser, isStaff, sendOtp, verifyOtp } from "@/server/auth";

export async function requestOtp(rawPhone: string): Promise<{ ok: boolean; error?: string; phone?: string; devCode?: string }> {
  const phone = normalizeIndianMobile(String(rawPhone ?? ""));
  if (!phone) return { ok: false, error: "Please enter a valid 10-digit Indian mobile number." };
  const res = await sendOtp(phone);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, phone, devCode: res.devCode };
}

export async function confirmOtp(phone: string, code: string, consent: boolean): Promise<{ ok: boolean; error?: string; needsName?: boolean; home?: string }> {
  const normalized = normalizeIndianMobile(String(phone ?? ""));
  if (!normalized || !/^\d{6}$/.test(String(code ?? "").trim())) return { ok: false, error: "Enter the 6-digit code." };
  const res = await verifyOtp(normalized, code, { consent: Boolean(consent) });
  if (!res.ok) return { ok: false, error: res.error };
  const user = await getCurrentUser();
  return { ok: true, needsName: res.needsName, home: isStaff(user) ? "/admin" : "/account" };
}

export async function saveName(name: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in again." };
  const parsed = z.string().trim().min(2).max(80).safeParse(name);
  if (!parsed.success) return { ok: false, error: "Please enter your name." };
  await db().update(schema.users).set({ name: parsed.data, updatedAt: new Date() }).where(eq(schema.users.id, user.id));
  return { ok: true };
}

export async function logout() {
  await destroySession();
  redirect("/");
}

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendOtpSms, smsConfigured } from "./integrations/sms";
import { getSettings } from "./settings";
import { rateLimited } from "./rate-limit";

export type Role = (typeof schema.roleEnum.enumValues)[number];
export type SessionUser = typeof schema.users.$inferSelect;

const COOKIE = "blush_session";
const SESSION_DAYS = 30;
const OTP_TTL_MIN = 5;
const OTP_MAX_PER_10_MIN = 3;
const OTP_MAX_ATTEMPTS = 5;
const STAFF_ROLES: Role[] = ["STAFF", "ADMIN", "OWNER"];
const ADMIN_ROLES: Role[] = ["ADMIN", "OWNER"];

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s === "change-me") {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
    return "dev-only-secret";
  }
  return s;
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const hashOtp = (phone: string, code: string) => sha256(`${secret()}:${phone}:${code}`);

const ipLimited = (limit: number, windowMs: number) => rateLimited("auth", limit, windowMs);

export type SendOtpResult = { ok: true; devCode?: string } | { ok: false; error: string };

export async function sendOtp(phone: string): Promise<SendOtpResult> {
  if (await ipLimited(10, 60 * 60_000)) return { ok: false, error: "Too many attempts. Please try again later." };

  const recent = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), gt(schema.otpCodes.createdAt, new Date(Date.now() - 10 * 60_000))));
  if ((recent[0]?.n ?? 0) >= OTP_MAX_PER_10_MIN) {
    return { ok: false, error: "Too many codes requested. Please wait 10 minutes." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db().insert(schema.otpCodes).values({
    phone,
    codeHash: hashOtp(phone, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60_000),
  });
  try {
    await sendOtpSms(phone, code);
  } catch (e) {
    console.error("OTP delivery failed", e);
    return { ok: false, error: "Could not send the code right now. Please try again." };
  }
  const showDevCode = !smsConfigured() && process.env.NODE_ENV !== "production";
  return { ok: true, devCode: showDevCode ? code : undefined };
}

export type VerifyOtpResult = { ok: true; isNew: boolean; needsName: boolean } | { ok: false; error: string };

export async function verifyOtp(phone: string, code: string, opts: { consent: boolean }): Promise<VerifyOtpResult> {
  if (await ipLimited(30, 60 * 60_000)) return { ok: false, error: "Too many attempts. Please try again later." };

  const [otp] = await db()
    .select()
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), isNull(schema.otpCodes.consumedAt), gt(schema.otpCodes.expiresAt, new Date())))
    .orderBy(desc(schema.otpCodes.createdAt))
    .limit(1);
  if (!otp) return { ok: false, error: "Code expired. Please request a new one." };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "Too many wrong attempts. Please request a new code." };

  const a = Buffer.from(otp.codeHash, "hex");
  const b = Buffer.from(hashOtp(phone, code.trim()), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db().update(schema.otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(schema.otpCodes.id, otp.id));
    return { ok: false, error: "Incorrect code. Please check and try again." };
  }
  await db().update(schema.otpCodes).set({ consumedAt: new Date() }).where(eq(schema.otpCodes.id, otp.id));

  let [user] = await db().select().from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
  let isNew = false;
  if (!user) {
    if (!opts.consent) return { ok: false, error: "Please accept the privacy policy to create your account." };
    [user] = await db().insert(schema.users).values({ phone }).returning();
    isNew = true;
  }
  if (user.isBlocked || user.deletedAt) return { ok: false, error: "This account is not active. Please contact the salon." };

  if (isNew || opts.consent) {
    const { policies } = await getSettings("policies");
    await db().insert(schema.consents).values({ userId: user.id, purpose: "TERMS_PRIVACY", granted: true, version: policies.version });
  }

  await createSession(user.id);
  return { ok: true, isNew, needsName: !user.name };
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db().insert(schema.sessions).values({ id: sha256(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db().delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db().delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  (await cookies()).delete(COOKIE);
}

/** Current user or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db()
    .select({ user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date()), isNull(schema.users.deletedAt)))
    .limit(1);
  const user = rows[0]?.user;
  if (!user || user.isBlocked) return null;
  return user;
});

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export const isStaff = (u: { role: Role } | null) => !!u && STAFF_ROLES.includes(u.role);
export const isAdmin = (u: { role: Role } | null) => !!u && ADMIN_ROLES.includes(u.role);

/** For admin pages/actions. STAFF can run the day; ADMIN/OWNER can change catalogue & settings. */
export async function requireStaff(level: "staff" | "admin" = "staff"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  const ok = level === "admin" ? isAdmin(user) : isStaff(user);
  if (!ok) redirect("/account");
  return user;
}

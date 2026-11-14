"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireStaff } from "@/server/auth";
import { createAppointment, reschedule, transition } from "@/server/appointments";
import { deleteMedia, saveUpload } from "@/server/media";
import { saveSettings } from "@/server/settings";
import { normalizeIndianMobile } from "@/lib/phone";
import { rupeesToPaise } from "@/lib/money";
import { hmToMinutes, isValidDateString, salonDateTimeToUtc } from "@/lib/time";
import type { AppointmentStatus } from "@/lib/appointment-status";

export type ActionState = { ok?: boolean; error?: string; message?: string };

const uuid = z.string().uuid();
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const bool = (f: FormData, k: string) => f.get(k) === "on";
const int = (f: FormData, k: string, def = 0) => {
  const n = parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : def;
};
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ── Appointments ─────────────────────────────────────────────────────

export async function adminTransition(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const id = uuid.safeParse(form.get("id"));
  const to = z.enum(["QUOTED", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"]).safeParse(form.get("to"));
  if (!id.success || !to.success) return { error: "Invalid request." };
  const quotedTotal = rupeesToPaise(form.get("quotedTotal"));
  const finalTotal = rupeesToPaise(form.get("finalTotal"));
  if (to.data === "QUOTED" && quotedTotal == null) return { error: "Enter the quoted price in ₹." };
  const res = await transition(id.data, to.data as AppointmentStatus, { id: user.id, role: user.role }, {
    quotedTotal,
    quoteNote: str(form, "quoteNote") || null,
    finalTotal,
    cancelReason: to.data === "CANCELLED" ? str(form, "cancelReason") || "Cancelled by salon" : null,
  });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Updated." };
}

export async function adminReschedule(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const id = uuid.safeParse(form.get("id"));
  const date = str(form, "date");
  const time = str(form, "time");
  const staffId = str(form, "staffId") || null;
  if (!id.success || !isValidDateString(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Choose a date and time." };
  const res = await reschedule(id.data, date, time, staffId, { id: user.id, role: user.role });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Appointment moved and customer notified." };
}

export async function adminCreateAppointment(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const phone = normalizeIndianMobile(str(form, "phone"));
  if (!phone) return { error: "Enter a valid 10-digit Indian mobile number." };
  const name = str(form, "name");
  const [serviceId, variantId] = str(form, "service").split("|");
  const date = str(form, "date");
  const time = str(form, "time");
  const source = z.enum(["PHONE", "WHATSAPP", "WALK_IN", "INSTAGRAM", "ADMIN"]).catch("ADMIN").parse(str(form, "source"));
  if (!uuid.safeParse(serviceId).success || (variantId && !uuid.safeParse(variantId).success)) return { error: "Choose a service." };
  if (!isValidDateString(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Choose a date and time." };

  let [customer] = await db().select().from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
  if (!customer) {
    if (name.length < 2) return { error: "New customer — please enter their name." };
    [customer] = await db().insert(schema.users).values({ phone, name }).returning();
  } else if (!customer.name && name) {
    await db().update(schema.users).set({ name }).where(eq(schema.users.id, customer.id));
  }

  const res = await createAppointment({
    customerId: customer.id,
    serviceId,
    variantId: variantId || null,
    addOnIds: form.getAll("addOnIds").map(String).filter((x) => uuid.safeParse(x).success),
    date,
    time,
    staffId: str(form, "staffId") || null,
    note: str(form, "note") || null,
    source,
    actor: { id: user.id, role: user.role },
  });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin", "layout");
  redirect(`/admin/appointments/${res.value.id}`);
}

// ── Customers ────────────────────────────────────────────────────────

export async function adminUpdateCustomer(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff();
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid customer." };
  await db()
    .update(schema.users)
    .set({ staffNotes: str(form, "staffNotes") || null, allergies: str(form, "allergies") || null, isBlocked: bool(form, "isBlocked"), updatedAt: new Date() })
    .where(and(eq(schema.users.id, id.data), eq(schema.users.role, "CUSTOMER")));
  revalidatePath(`/admin/customers/${id.data}`);
  return { ok: true, message: "Saved." };
}

// ── Enquiries ────────────────────────────────────────────────────────

export async function adminSetEnquiryStatus(form: FormData) {
  await requireStaff();
  const id = uuid.parse(form.get("id"));
  const status = z.enum(["NEW", "CONTACTED", "CONVERTED", "CLOSED", "SPAM"]).parse(form.get("status"));
  await db().update(schema.enquiries).set({ status }).where(eq(schema.enquiries.id, id));
  revalidatePath("/admin/enquiries");
}

// ── Services & add-ons (admin only) ──────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(2).max(80),
  summary: z.string().min(2).max(300),
  categoryId: uuid,
  priceType: z.enum(["FIXED", "FROM", "ON_ENQUIRY"]),
  durationMin: z.number().int().min(5).max(600),
  bufferMin: z.number().int().min(0).max(120),
  bookingMode: z.enum(["INSTANT", "REQUEST"]),
  sortOrder: z.number().int(),
});

export async function adminSaveService(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("admin");
  const parsed = serviceSchema.safeParse({
    name: str(form, "name"),
    summary: str(form, "summary"),
    categoryId: str(form, "categoryId"),
    priceType: str(form, "priceType"),
    durationMin: int(form, "durationMin"),
    bufferMin: int(form, "bufferMin", 15),
    bookingMode: str(form, "bookingMode"),
    sortOrder: int(form, "sortOrder"),
  });
  if (!parsed.success) return { error: `Check the form: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}` };
  const basePrice = rupeesToPaise(form.get("basePrice"));
  if (parsed.data.priceType !== "ON_ENQUIRY" && basePrice == null) return { error: "Enter a price, or choose “Price on enquiry”." };
  const values = { ...parsed.data, basePrice: parsed.data.priceType === "ON_ENQUIRY" ? null : basePrice, emoji: str(form, "emoji") || null, isActive: bool(form, "isActive") };

  const id = str(form, "id");
  if (id) {
    await db().update(schema.services).set(values).where(eq(schema.services.id, uuid.parse(id)));
  } else {
    await db().insert(schema.services).values({ ...values, slug: `${slugify(values.name)}-${Date.now().toString(36)}` });
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function adminAddVariant(form: FormData) {
  await requireStaff("admin");
  const serviceId = uuid.parse(form.get("serviceId"));
  const price = rupeesToPaise(form.get("price"));
  const name = str(form, "name");
  if (!name || price == null) return;
  await db().insert(schema.serviceVariants).values({ serviceId, name, price, durationMin: Math.max(5, int(form, "durationMin", 60)), sortOrder: int(form, "sortOrder") });
  revalidatePath("/", "layout");
}

export async function adminDeleteVariant(form: FormData) {
  await requireStaff("admin");
  // Soft-delete: old appointments may reference it.
  await db().update(schema.serviceVariants).set({ isActive: false }).where(eq(schema.serviceVariants.id, uuid.parse(form.get("id"))));
  revalidatePath("/", "layout");
}

export async function adminSaveAddOn(form: FormData) {
  await requireStaff("admin");
  const price = rupeesToPaise(form.get("price"));
  const name = str(form, "name");
  if (!name || price == null) return;
  const serviceIds = form.getAll("serviceIds").map(String).filter((x) => uuid.safeParse(x).success);
  const values = { name, price, durationMin: Math.max(0, int(form, "durationMin")), isActive: bool(form, "isActive") || !str(form, "id") };
  const id = str(form, "id");
  const addOnId = id
    ? (await db().update(schema.addOns).set(values).where(eq(schema.addOns.id, uuid.parse(id))).returning())[0].id
    : (await db().insert(schema.addOns).values(values).returning())[0].id;
  await db().delete(schema.serviceAddOns).where(eq(schema.serviceAddOns.addOnId, addOnId));
  if (serviceIds.length) await db().insert(schema.serviceAddOns).values(serviceIds.map((serviceId) => ({ serviceId, addOnId })));
  revalidatePath("/", "layout");
}

// ── Gallery (staff) ──────────────────────────────────────────────────

export async function adminUploadGallery(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireStaff();
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose at least one photo." };
  if (files.length > 10) return { error: "Upload up to 10 photos at a time." };
  const caption = str(form, "caption");
  const styleId = str(form, "artStyleId") || null;
  let n = 0;
  for (const f of files) {
    try {
      const m = await saveUpload(f, "GALLERY", { ownerId: user.id });
      await db().insert(schema.galleryItems).values({
        mediaId: m.id,
        caption: caption || f.name.replace(/\.[a-z]+$/i, "").replace(/[-_]+/g, " "),
        artStyleId: styleId && uuid.safeParse(styleId).success ? styleId : null,
        isFeatured: bool(form, "isFeatured"),
        isPublished: bool(form, "isPublished"),
        clientConsent: bool(form, "clientConsent"),
        sortOrder: 100,
      });
      n++;
    } catch (e) {
      return { error: `${f.name}: ${(e as Error).message}` };
    }
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `Uploaded ${n} photo${n > 1 ? "s" : ""}.` };
}

export async function adminUpdateGalleryItem(form: FormData) {
  await requireStaff();
  const id = uuid.parse(form.get("id"));
  const op = str(form, "op");
  const [item] = await db().select().from(schema.galleryItems).where(eq(schema.galleryItems.id, id));
  if (!item) return;
  if (op === "delete") {
    const [m] = await db().select({ id: schema.media.id, path: schema.media.path }).from(schema.media).where(eq(schema.media.id, item.mediaId));
    await db().update(schema.artStyles).set({ coverMediaId: null }).where(eq(schema.artStyles.coverMediaId, item.mediaId));
    if (m) await deleteMedia([m]); // cascades to gallery item
  } else if (op === "cover" && item.artStyleId) {
    await db().update(schema.artStyles).set({ coverMediaId: item.mediaId }).where(eq(schema.artStyles.id, item.artStyleId));
  } else {
    await db()
      .update(schema.galleryItems)
      .set({
        caption: str(form, "caption") || item.caption,
        artStyleId: str(form, "artStyleId") && uuid.safeParse(str(form, "artStyleId")).success ? str(form, "artStyleId") : null,
        isPublished: bool(form, "isPublished"),
        isFeatured: bool(form, "isFeatured"),
        clientConsent: bool(form, "clientConsent"),
        sortOrder: int(form, "sortOrder", item.sortOrder),
      })
      .where(eq(schema.galleryItems.id, id));
  }
  revalidatePath("/", "layout");
}

// ── Schedule ─────────────────────────────────────────────────────────

export async function adminSaveHours(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("admin");
  for (let wd = 0; wd < 7; wd++) {
    const open = str(form, `open-${wd}`) || "10:00";
    const close = str(form, `close-${wd}`) || "19:00";
    if (!/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close) || hmToMinutes(close) <= hmToMinutes(open)) {
      return { error: "Closing time must be after opening time." };
    }
    await db()
      .insert(schema.businessHours)
      .values({ weekday: wd, isClosed: bool(form, `closed-${wd}`), openTime: open, closeTime: close })
      .onConflictDoUpdate({ target: schema.businessHours.weekday, set: { isClosed: bool(form, `closed-${wd}`), openTime: open, closeTime: close } });
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Opening hours saved." };
}

export async function adminAddTimeOff(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff();
  const from = str(form, "fromDate");
  const to = str(form, "toDate") || from;
  const fromTime = str(form, "fromTime") || "00:00";
  const toTime = str(form, "toTime") || "23:59";
  if (!isValidDateString(from) || !isValidDateString(to)) return { error: "Choose dates." };
  const startsAt = salonDateTimeToUtc(from, hmToMinutes(fromTime));
  const endsAt = salonDateTimeToUtc(to, hmToMinutes(toTime) + (toTime === "23:59" ? 1 : 0));
  if (endsAt <= startsAt) return { error: "End must be after start." };
  const staffId = str(form, "staffId");
  await db().insert(schema.timeOff).values({ staffId: staffId && uuid.safeParse(staffId).success ? staffId : null, startsAt, endsAt, reason: str(form, "reason") || null });
  revalidatePath("/admin/schedule");
  return { ok: true, message: "Blocked. Existing bookings in this period are not cancelled automatically — check the calendar." };
}

export async function adminDeleteTimeOff(form: FormData) {
  await requireStaff();
  await db().delete(schema.timeOff).where(eq(schema.timeOff.id, uuid.parse(form.get("id"))));
  revalidatePath("/admin/schedule");
}

// ── Staff (admin only) ───────────────────────────────────────────────

export async function adminSaveStaff(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("admin");
  const displayName = str(form, "displayName");
  if (displayName.length < 2) return { error: "Enter a name." };
  const color = /^#[0-9a-f]{6}$/i.test(str(form, "calendarColor")) ? str(form, "calendarColor") : "#c65b86";
  const serviceIds = form.getAll("serviceIds").map(String).filter((x) => uuid.safeParse(x).success);

  // Optional login: link a phone number so this person can open the dashboard.
  let userId: string | null = null;
  const rawPhone = str(form, "phone");
  if (rawPhone) {
    const phone = normalizeIndianMobile(rawPhone);
    if (!phone) return { error: "Enter a valid mobile number for the staff login." };
    const role = z.enum(["STAFF", "ADMIN"]).catch("STAFF").parse(str(form, "role"));
    const [existing] = await db().select().from(schema.users).where(eq(schema.users.phone, phone));
    if (existing?.role === "OWNER") userId = existing.id;
    else if (existing) userId = (await db().update(schema.users).set({ role, name: existing.name ?? displayName }).where(eq(schema.users.id, existing.id)).returning())[0].id;
    else userId = (await db().insert(schema.users).values({ phone, name: displayName, role }).returning())[0].id;
  }

  const id = str(form, "id");
  const values = { displayName, calendarColor: color, isBookable: bool(form, "isBookable"), sortOrder: int(form, "sortOrder"), ...(rawPhone ? { userId } : {}) };
  const staffId = id
    ? (await db().update(schema.staff).set(values).where(eq(schema.staff.id, uuid.parse(id))).returning())[0].id
    : (await db().insert(schema.staff).values(values).returning())[0].id;

  await db().delete(schema.staffServices).where(eq(schema.staffServices.staffId, staffId));
  if (serviceIds.length) await db().insert(schema.staffServices).values(serviceIds.map((serviceId) => ({ staffId, serviceId })));
  revalidatePath("/admin/staff");
  return { ok: true, message: "Saved." };
}

export async function adminRemoveStaffLogin(form: FormData) {
  await requireStaff("admin");
  const staffId = uuid.parse(form.get("id"));
  const [s] = await db().select().from(schema.staff).where(eq(schema.staff.id, staffId));
  if (!s?.userId) return;
  const [u] = await db().select().from(schema.users).where(eq(schema.users.id, s.userId));
  if (u && u.role !== "OWNER") {
    await db().update(schema.users).set({ role: "CUSTOMER" }).where(eq(schema.users.id, u.id));
    await db().delete(schema.sessions).where(eq(schema.sessions.userId, u.id));
  }
  await db().update(schema.staff).set({ userId: null }).where(eq(schema.staff.id, staffId));
  revalidatePath("/admin/staff");
}

// ── Settings (admin only) ────────────────────────────────────────────

export async function adminSaveSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff("admin");
  const section = str(form, "section");
  if (section === "salon") {
    const phone = str(form, "phone") ? normalizeIndianMobile(str(form, "phone")) : "";
    const whatsapp = str(form, "whatsapp") ? normalizeIndianMobile(str(form, "whatsapp")) : "";
    if (phone === null || whatsapp === null) return { error: "Phone numbers must be valid Indian mobiles." };
    const url = (k: string) => {
      const v = str(form, k);
      return v && /^https:\/\//.test(v) ? v : "";
    };
    await saveSettings("salon", {
      name: str(form, "name") || "BLUSH",
      tagline: str(form, "tagline"),
      phone,
      whatsapp,
      email: str(form, "email"),
      address: str(form, "address"),
      mapLink: url("mapLink"),
      mapEmbedUrl: /^https:\/\/(www\.)?google\.com\/maps\/embed/.test(str(form, "mapEmbedUrl")) ? str(form, "mapEmbedUrl") : "",
      instagram: url("instagram"),
      googleReviewsUrl: url("googleReviewsUrl"),
      announcement: str(form, "announcement").slice(0, 140),
    });
  } else if (section === "booking") {
    const n = (k: string, min: number, max: number, def: number) => Math.min(max, Math.max(min, int(form, k, def)));
    await saveSettings("booking", {
      slotStepMin: [15, 20, 30, 60].includes(int(form, "slotStepMin")) ? int(form, "slotStepMin") : 30,
      minLeadMin: n("minLeadMin", 0, 72 * 60, 120),
      maxAdvanceDays: n("maxAdvanceDays", 1, 180, 45),
      cancelWindowHours: n("cancelWindowHours", 0, 168, 24),
      quoteValidHours: n("quoteValidHours", 1, 168, 24),
      autoConfirmInstant: bool(form, "autoConfirmInstant"),
    });
  } else if (section === "policies") {
    await saveSettings("policies", {
      privacy: str(form, "privacy").slice(0, 20000),
      cancellation: str(form, "cancellation").slice(0, 20000),
      version: new Date().toISOString().slice(0, 10),
    });
  } else {
    return { error: "Unknown section." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

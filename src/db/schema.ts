import {
  pgTable, pgEnum, uuid, text, integer, boolean, timestamp, jsonb, primaryKey, index,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["CUSTOMER", "STAFF", "ADMIN", "OWNER"]);
export const priceTypeEnum = pgEnum("price_type", ["FIXED", "FROM", "ON_ENQUIRY"]);
export const bookingModeEnum = pgEnum("booking_mode", ["INSTANT", "REQUEST"]);
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "REQUESTED", // price-on-enquiry service, waiting for salon quote
  "QUOTED", // salon sent a price, waiting for customer
  "CONFIRMED",
  "CHECKED_IN",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "EXPIRED", // quote not accepted in time
]);
export const bookingSourceEnum = pgEnum("booking_source", ["WEB", "WHATSAPP", "PHONE", "WALK_IN", "INSTAGRAM", "ADMIN"]);
export const mediaKindEnum = pgEnum("media_kind", ["GALLERY", "INSPIRATION"]);
export const enquiryStatusEnum = pgEnum("enquiry_status", ["NEW", "CONTACTED", "CONVERTED", "CLOSED", "SPAM"]);
export const channelEnum = pgEnum("channel", ["WHATSAPP", "SMS", "EMAIL", "CONSOLE"]);
export const notifStatusEnum = pgEnum("notif_status", ["QUEUED", "SENT", "FAILED"]);
export const consentPurposeEnum = pgEnum("consent_purpose", ["TERMS_PRIVACY", "MARKETING_WHATSAPP"]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();

// ── People & auth ────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: roleEnum("role").notNull().default("CUSTOMER"),
  name: text("name"),
  phone: text("phone").notNull().unique(), // E.164, e.g. +919812345678
  email: text("email"),
  nailPrefs: text("nail_prefs"), // shape / length / finish preferences (customer-editable)
  allergies: text("allergies"), // shown to staff
  staffNotes: text("staff_notes"), // internal only
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  deletedAt: ts("deleted_at"),
});

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: ts("consumed_at"),
  createdAt: createdAt(),
}, (t) => [index("otp_phone_idx").on(t.phone, t.createdAt)]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256(token) — raw token only lives in the cookie
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  createdAt: createdAt(),
});

export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: consentPurposeEnum("purpose").notNull(),
  granted: boolean("granted").notNull(),
  version: text("version").notNull(),
  createdAt: createdAt(),
});

// ── Catalogue ────────────────────────────────────────────────────────
export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").notNull().references(() => serviceCategories.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary").notNull(),
  priceType: priceTypeEnum("price_type").notNull().default("FROM"),
  basePrice: integer("base_price"), // paise
  durationMin: integer("duration_min").notNull(),
  bufferMin: integer("buffer_min").notNull().default(15),
  bookingMode: bookingModeEnum("booking_mode").notNull().default("INSTANT"),
  emoji: text("emoji"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const serviceVariants = pgTable("service_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Short / Medium / Long
  price: integer("price").notNull(),
  durationMin: integer("duration_min").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const addOns = pgTable("add_ons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  durationMin: integer("duration_min").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const serviceAddOns = pgTable("service_add_ons", {
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  addOnId: uuid("add_on_id").notNull().references(() => addOns.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.serviceId, t.addOnId] })]);

// ── Staff & schedule ─────────────────────────────────────────────────
export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  displayName: text("display_name").notNull(),
  calendarColor: text("calendar_color").notNull().default("#c65b86"),
  isBookable: boolean("is_bookable").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const staffServices = pgTable("staff_services", {
  staffId: uuid("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.staffId, t.serviceId] })]);

export const businessHours = pgTable("business_hours", {
  weekday: integer("weekday").primaryKey(), // 0 = Sunday … 6 = Saturday
  isClosed: boolean("is_closed").notNull().default(false),
  openTime: text("open_time").notNull().default("10:00"),
  closeTime: text("close_time").notNull().default("19:00"),
});

export const timeOff = pgTable("time_off", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").references(() => staff.id, { onDelete: "cascade" }), // null = whole salon closed
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at").notNull(),
  reason: text("reason"),
});

// ── Appointments ─────────────────────────────────────────────────────
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ref: text("ref").notNull().unique(), // BL-7K2M9
  customerId: uuid("customer_id").notNull().references(() => users.id),
  staffId: uuid("staff_id").references(() => staff.id),
  status: appointmentStatusEnum("status").notNull(),
  source: bookingSourceEnum("source").notNull().default("WEB"),
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at").notNull(), // includes cleanup buffer
  customerNote: text("customer_note"),
  estimateMin: integer("estimate_min"), // paise
  estimateMax: integer("estimate_max"),
  quotedTotal: integer("quoted_total"),
  quoteNote: text("quote_note"),
  quoteExpiresAt: ts("quote_expires_at"),
  finalTotal: integer("final_total"),
  confirmedAt: ts("confirmed_at"),
  checkedInAt: ts("checked_in_at"),
  completedAt: ts("completed_at"),
  cancelledAt: ts("cancelled_at"),
  cancelledBy: roleEnum("cancelled_by"),
  cancelReason: text("cancel_reason"),
  reminder24hAt: ts("reminder_24h_at"),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [
  index("appt_staff_start_idx").on(t.staffId, t.startsAt),
  index("appt_customer_start_idx").on(t.customerId, t.startsAt),
  index("appt_status_start_idx").on(t.status, t.startsAt),
]);

export type AddOnSnapshot = { id: string; name: string; price: number; durationMin: number };

export const appointmentItems = pgTable("appointment_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  variantId: uuid("variant_id").references(() => serviceVariants.id),
  name: text("name").notNull(), // snapshot at booking time
  price: integer("price"), // null when price on enquiry
  durationMin: integer("duration_min").notNull(),
  addOns: jsonb("add_ons").$type<AddOnSnapshot[]>().notNull().default([]),
});

export const appointmentEvents = pgTable("appointment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }), // null = system
  fromStatus: appointmentStatusEnum("from_status"),
  toStatus: appointmentStatusEnum("to_status").notNull(),
  note: text("note"),
  createdAt: createdAt(),
});

// ── Media & gallery ──────────────────────────────────────────────────
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: mediaKindEnum("kind").notNull(),
  path: text("path").notNull(), // relative to STORAGE_DIR
  mime: text("mime").notNull(),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
});

export const artStyles = pgTable("art_styles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  coverMediaId: uuid("cover_media_id").references(() => media.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const galleryItems = pgTable("gallery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  mediaId: uuid("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  caption: text("caption").notNull(),
  artStyleId: uuid("art_style_id").references(() => artStyles.id, { onDelete: "set null" }),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  clientConsent: boolean("client_consent").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

// ── Leads, notifications, settings ───────────────────────────────────
export const enquiries = pgTable("enquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  status: enquiryStatusEnum("status").notNull().default("NEW"),
  consentAt: ts("consent_at").notNull(),
  createdAt: createdAt(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  to: text("to").notNull(),
  channel: channelEnum("channel").notNull(),
  template: text("template").notNull(),
  body: text("body").notNull(),
  status: notifStatusEnum("status").notNull().default("QUEUED"),
  providerMsgId: text("provider_msg_id"),
  error: text("error"),
  createdAt: createdAt(),
  sentAt: ts("sent_at"),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

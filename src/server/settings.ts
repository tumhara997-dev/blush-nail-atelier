import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";

export type SalonSettings = {
  name: string;
  tagline: string;
  phone: string; // E.164
  whatsapp: string; // E.164
  email: string;
  address: string;
  mapEmbedUrl: string;
  mapLink: string;
  instagram: string;
  googleReviewsUrl: string;
  announcement: string; // thin bar above the header, e.g. a seasonal message; empty = hidden
};

export type BookingSettings = {
  slotStepMin: number; // slot grid, e.g. 30
  minLeadMin: number; // earliest bookable time from now
  maxAdvanceDays: number;
  cancelWindowHours: number; // customers can self-cancel until this many hours before
  autoConfirmInstant: boolean; // INSTANT services confirm without staff approval
  quoteValidHours: number;
};

export type PolicySettings = { privacy: string; cancellation: string; version: string };

export const DEFAULT_SETTINGS: { salon: SalonSettings; booking: BookingSettings; policies: PolicySettings } = {
  salon: {
    name: "BLUSH",
    tagline: "Nail care • Art • Extensions",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    mapEmbedUrl: "",
    mapLink: "",
    instagram: "",
    googleReviewsUrl: "",
    announcement: "Bridal & festive season — reserve your date early",
  },
  booking: {
    slotStepMin: 30,
    minLeadMin: 120,
    maxAdvanceDays: 45,
    cancelWindowHours: 24,
    autoConfirmInstant: true,
    quoteValidHours: 24,
  },
  policies: {
    version: "2026-11-15",
    privacy:
      "We collect your name and mobile number (and optionally email, nail preferences and inspiration photos) only to manage your appointments and contact you about them.\n\nWe do not sell or share your data with advertisers. Messages are sent through WhatsApp/SMS providers on our behalf.\n\nYou can update your details or delete your account at any time from My Account → Profile. Deleted accounts are anonymised; appointment records needed for accounts/tax are kept without your personal details.\n\nQuestions or complaints: contact us using the details on the Contact page.",
    cancellation:
      "You can cancel or ask to reschedule from My Account up to 24 hours before your appointment.\n\nWithin 24 hours, please message us on WhatsApp. Repeated no-shows may require an advance deposit for future bookings.\n\nFinal prices for extensions and nail art depend on length, design and products, and are confirmed before your service begins.",
  },
};

type Settings = typeof DEFAULT_SETTINGS;
export type SettingsKey = keyof Settings;

export async function getSettings<K extends SettingsKey>(...keys: K[]): Promise<Pick<Settings, K>> {
  const rows = await db().select().from(schema.settings).where(inArray(schema.settings.key, keys));
  const out = {} as Pick<Settings, K>;
  for (const k of keys) {
    const row = rows.find((r) => r.key === k);
    out[k] = { ...DEFAULT_SETTINGS[k], ...((row?.value as object) ?? {}) } as Settings[K];
  }
  return out;
}

export async function saveSettings<K extends SettingsKey>(key: K, value: Partial<Settings[K]>) {
  const current = (await getSettings(key))[key];
  const merged = { ...current, ...value };
  await db()
    .insert(schema.settings)
    .values({ key, value: merged })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: merged, updatedAt: new Date() } });
}

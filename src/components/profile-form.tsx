"use client";

import { updateProfile } from "@/actions/account";
import { ActionForm, Submit } from "./forms";

type P = { name: string; email: string; nailPrefs: string; allergies: string; marketingOptIn: boolean };

export function ProfileForm({ user }: { user: P }) {
  return (
    <ActionForm action={updateProfile} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="p-name" className="label">Name *</label>
        <input id="p-name" name="name" defaultValue={user.name} required className="input" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="p-email" className="label">Email (optional)</label>
        <input id="p-email" name="email" type="email" defaultValue={user.email} className="input" autoComplete="email" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="p-prefs" className="label">Nail preferences</label>
        <input id="p-prefs" name="nailPrefs" defaultValue={user.nailPrefs} className="input" placeholder="e.g. almond shape, medium length, nude tones" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="p-allergies" className="label">Allergies or sensitivities</label>
        <input id="p-allergies" name="allergies" defaultValue={user.allergies} className="input" placeholder="Shared only with your nail artist" />
      </div>
      <label className="flex items-start gap-2 text-sm text-muted sm:col-span-2">
        <input type="checkbox" name="marketingOptIn" defaultChecked={user.marketingOptIn} className="mt-1 accent-pink" />
        Send me occasional offers and new designs on WhatsApp (you can turn this off anytime).
      </label>
      <div className="sm:col-span-2">
        <Submit className="btn-primary">Save</Submit>
      </div>
    </ActionForm>
  );
}

import { requireStaff } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { adminSaveSettings } from "@/actions/admin";
import { ActionForm, Submit } from "@/components/forms";
import { smsConfigured } from "@/server/integrations/sms";
import { whatsappConfigured } from "@/server/integrations/whatsapp";

export const metadata = { title: "Settings" };

function Field({ label, name, value, type = "text", hint, wide }: { label: string; name: string; value: string | number; type?: string; hint?: string; wide?: boolean }) {
  return (
    <label className={`text-xs ${wide ? "sm:col-span-2" : ""}`}>
      <span className="label">{label}</span>
      <input name={name} type={type} defaultValue={value} className="input" />
      {hint && <span className="mt-1 block text-muted">{hint}</span>}
    </label>
  );
}

export default async function SettingsPage() {
  await requireStaff("admin");
  const { salon, booking, policies } = await getSettings("salon", "booking", "policies");
  const sms = smsConfigured();
  const wa = whatsappConfigured();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="h-display text-3xl">Settings</h1>

      <div className="card grid gap-2 p-4 text-sm sm:grid-cols-2">
        <p>SMS login codes: <b className={sms ? "text-emerald-700" : "text-amber-700"}>{sms ? "MSG91 connected" : "Not connected (dev mode)"}</b></p>
        <p>WhatsApp messages: <b className={wa ? "text-emerald-700" : "text-amber-700"}>{wa ? "Cloud API connected" : "Not connected (logged only)"}</b></p>
        {(!sms || !wa) && <p className="text-xs text-muted sm:col-span-2">Add the provider keys in the server environment (.env). See README → Going live.</p>}
      </div>

      <ActionForm action={adminSaveSettings} className="card grid gap-3 p-5 sm:grid-cols-2">
        <input type="hidden" name="section" value="salon" />
        <h2 className="font-serif text-lg text-plum sm:col-span-2">Salon details</h2>
        <Field label="Salon name" name="name" value={salon.name} />
        <Field label="Tagline" name="tagline" value={salon.tagline} />
        <Field label="Phone" name="phone" type="tel" value={salon.phone} />
        <Field label="WhatsApp number" name="whatsapp" type="tel" value={salon.whatsapp} hint="Shows the WhatsApp chat button and receives new-booking alerts." />
        <Field label="Email" name="email" type="email" value={salon.email} />
        <Field label="Instagram URL" name="instagram" value={salon.instagram} />
        <label className="text-xs sm:col-span-2">
          <span className="label">Address</span>
          <textarea name="address" rows={2} defaultValue={salon.address} className="input" />
        </label>
        <Field label="Google Maps link" name="mapLink" value={salon.mapLink} wide />
        <Field label="Google Maps embed URL" name="mapEmbedUrl" value={salon.mapEmbedUrl} wide hint="Google Maps → Share → Embed a map → copy only the src URL (starts with https://www.google.com/maps/embed)." />
        <Field label="Google reviews URL" name="googleReviewsUrl" value={salon.googleReviewsUrl} wide />
        <Field label="Announcement bar (top of every page)" name="announcement" value={salon.announcement} wide hint="Seasonal message, e.g. “Diwali nail art now booking”. Leave empty to hide the bar." />
        <div className="sm:col-span-2"><Submit>Save salon details</Submit></div>
      </ActionForm>

      <ActionForm action={adminSaveSettings} className="card grid gap-3 p-5 sm:grid-cols-2">
        <input type="hidden" name="section" value="booking" />
        <h2 className="font-serif text-lg text-plum sm:col-span-2">Booking rules</h2>
        <label className="text-xs">
          <span className="label">Online slot interval</span>
          <select name="slotStepMin" defaultValue={booking.slotStepMin} className="input">
            {[15, 20, 30, 60].map((n) => <option key={n} value={n}>Every {n} minutes</option>)}
          </select>
        </label>
        <Field label="Earliest online booking (minutes from now)" name="minLeadMin" type="number" value={booking.minLeadMin} />
        <Field label="Book up to (days ahead)" name="maxAdvanceDays" type="number" value={booking.maxAdvanceDays} />
        <Field label="Free cancellation until (hours before)" name="cancelWindowHours" type="number" value={booking.cancelWindowHours} />
        <Field label="Quotes valid for (hours)" name="quoteValidHours" type="number" value={booking.quoteValidHours} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="autoConfirmInstant" defaultChecked={booking.autoConfirmInstant} className="accent-pink" />
          Auto-confirm instant services
        </label>
        <div className="sm:col-span-2"><Submit>Save booking rules</Submit></div>
      </ActionForm>

      <ActionForm action={adminSaveSettings} className="card space-y-3 p-5">
        <input type="hidden" name="section" value="policies" />
        <h2 className="font-serif text-lg text-plum">Policies</h2>
        <p className="text-xs text-muted">Current version: {policies.version}. Saving creates a new version date; new sign-ups record which version they accepted.</p>
        <label className="block text-xs">
          <span className="label">Privacy policy</span>
          <textarea name="privacy" rows={8} defaultValue={policies.privacy} className="input" />
        </label>
        <label className="block text-xs">
          <span className="label">Cancellation policy</span>
          <textarea name="cancellation" rows={5} defaultValue={policies.cancellation} className="input" />
        </label>
        <Submit>Save policies</Submit>
      </ActionForm>
    </div>
  );
}

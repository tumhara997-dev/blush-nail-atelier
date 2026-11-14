import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCatalog } from "@/server/catalog";
import { adminCreateAppointment } from "@/actions/admin";
import { ActionForm, Submit } from "@/components/forms";
import { salonDateString } from "@/lib/time";
import { formatPaise } from "@/lib/money";

export const metadata = { title: "New booking" };

export default async function NewBookingPage() {
  const [catalog, staff] = await Promise.all([
    getCatalog(),
    db().select().from(schema.staff).where(eq(schema.staff.isBookable, true)).orderBy(asc(schema.staff.sortOrder)),
  ]);
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="h-display text-3xl">New booking</h1>
      <p className="text-sm text-muted">For bookings taken by phone, WhatsApp, Instagram or walk-in. The customer gets a WhatsApp confirmation and can log in later with this number to see it.</p>
      <ActionForm action={adminCreateAppointment} className="card grid gap-3 p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="n-phone">Customer mobile *</label>
          <input id="n-phone" name="phone" type="tel" required className="input" placeholder="98123 45678" />
        </div>
        <div>
          <label className="label" htmlFor="n-name">Name (required for new customers)</label>
          <input id="n-name" name="name" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="n-service">Service *</label>
          <select id="n-service" name="service" required className="input">
            <option value="">Choose…</option>
            {catalog.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {c.services.flatMap((s) =>
                  s.variants.length
                    ? s.variants.map((v) => <option key={v.id} value={`${s.id}|${v.id}`}>{s.name} — {v.name} ({formatPaise(v.price)}, {v.durationMin} min)</option>)
                    : [<option key={s.id} value={s.id}>{s.name} ({s.durationMin} min)</option>],
                )}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="n-date">Date *</label>
          <input id="n-date" name="date" type="date" required defaultValue={salonDateString()} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="n-time">Start time *</label>
          <input id="n-time" name="time" type="time" step={900} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="n-staff">Artist</label>
          <select id="n-staff" name="staffId" className="input">
            <option value="">Any free artist</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="n-source">Booked via</label>
          <select id="n-source" name="source" className="input" defaultValue="WHATSAPP">
            <option value="WHATSAPP">WhatsApp</option>
            <option value="PHONE">Phone call</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="WALK_IN">Walk-in</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="n-note">Notes</label>
          <textarea id="n-note" name="note" rows={2} className="input" />
        </div>
        <div className="sm:col-span-2">
          <Submit className="btn-primary">Create booking</Submit>
          <p className="mt-2 text-xs text-muted">Staff bookings can start at any quarter hour and skip the online lead-time rule, but still can&apos;t overlap another booking, time off, or fall outside opening hours.</p>
        </div>
      </ActionForm>
    </div>
  );
}

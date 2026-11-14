import { asc, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminAddTimeOff, adminDeleteTimeOff, adminSaveHours } from "@/actions/admin";
import { ActionForm, Submit } from "@/components/forms";
import { isAdmin, requireStaff } from "@/server/auth";
import { formatDateTime, salonDateString } from "@/lib/time";

export const metadata = { title: "Time off & hours" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function SchedulePage() {
  const user = await requireStaff();
  const [hours, staff, offs] = await Promise.all([
    db().select().from(schema.businessHours).orderBy(asc(schema.businessHours.weekday)),
    db().select().from(schema.staff).orderBy(asc(schema.staff.sortOrder)),
    db().select().from(schema.timeOff).where(gt(schema.timeOff.endsAt, new Date())).orderBy(asc(schema.timeOff.startsAt)),
  ]);
  const order = [1, 2, 3, 4, 5, 6, 0];
  const today = salonDateString();

  return (
    <div className="space-y-6">
      <h1 className="h-display text-3xl">Time off & opening hours</h1>

      <section className="card p-5">
        <h2 className="mb-1 font-serif text-lg text-plum">Block time (holiday, leave, private event)</h2>
        <p className="mb-3 text-xs text-muted">Blocked time disappears from online booking. Leave “Artist” empty to close the whole salon.</p>
        <ActionForm action={adminAddTimeOff} resetOnSuccess className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="t-from">From date *</label>
            <input id="t-from" type="date" name="fromDate" required min={today} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="t-to">To date</label>
            <input id="t-to" type="date" name="toDate" min={today} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="t-staff">Artist</label>
            <select id="t-staff" name="staffId" className="input">
              <option value="">Whole salon</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-ft">From time (optional)</label>
            <input id="t-ft" type="time" name="fromTime" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="t-tt">To time (optional)</label>
            <input id="t-tt" type="time" name="toTime" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="t-reason">Reason</label>
            <input id="t-reason" name="reason" className="input" placeholder="e.g. Diwali" />
          </div>
          <div className="sm:col-span-3"><Submit>Block time</Submit></div>
        </ActionForm>

        {offs.length > 0 && (
          <ul className="mt-5 divide-y divide-line text-sm">
            {offs.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <b>{t.staffId ? staff.find((s) => s.id === t.staffId)?.displayName : "Whole salon"}</b> · {formatDateTime(t.startsAt)} → {formatDateTime(t.endsAt)}
                  {t.reason && <span className="text-muted"> · {t.reason}</span>}
                </span>
                <form action={adminDeleteTimeOff}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="btn-ghost btn-sm">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-serif text-lg text-plum">Weekly opening hours</h2>
        {isAdmin(user) ? (
          <ActionForm action={adminSaveHours} className="space-y-2">
            {order.map((wd) => {
              const h = hours.find((x) => x.weekday === wd);
              return (
                <div key={wd} className="grid grid-cols-[100px_1fr_1fr_auto] items-center gap-2 text-sm">
                  <span className="font-bold">{DAYS[wd]}</span>
                  <input type="time" name={`open-${wd}`} defaultValue={h?.openTime ?? "10:00"} className="input py-1.5" aria-label={`${DAYS[wd]} opens`} />
                  <input type="time" name={`close-${wd}`} defaultValue={h?.closeTime ?? "19:00"} className="input py-1.5" aria-label={`${DAYS[wd]} closes`} />
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" name={`closed-${wd}`} defaultChecked={h?.isClosed} className="accent-pink" /> Closed</label>
                </div>
              );
            })}
            <div className="pt-2"><Submit>Save hours</Submit></div>
          </ActionForm>
        ) : (
          <p className="text-sm text-muted">Only an admin can change opening hours.</p>
        )}
      </section>
    </div>
  );
}

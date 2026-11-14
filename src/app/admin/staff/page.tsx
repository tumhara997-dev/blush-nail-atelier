import { asc, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/server/auth";
import { getCatalog } from "@/server/catalog";
import { adminRemoveStaffLogin, adminSaveStaff } from "@/actions/admin";
import { ActionForm, Submit } from "@/components/forms";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  await requireStaff("admin");
  const [staff, links, catalog] = await Promise.all([
    db().select().from(schema.staff).orderBy(asc(schema.staff.sortOrder)),
    db().select().from(schema.staffServices),
    getCatalog(),
  ]);
  const userIds = staff.map((s) => s.userId).filter((x): x is string => !!x);
  const users = userIds.length ? await db().select().from(schema.users).where(inArray(schema.users.id, userIds)) : [];
  const services = catalog.flatMap((c) => c.services);

  const Fields = ({ s }: { s?: (typeof staff)[number] }) => {
    const u = users.find((x) => x.id === s?.userId);
    const linked = links.filter((l) => l.staffId === s?.id);
    return (
      <>
        {s && <input type="hidden" name="id" value={s.id} />}
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">
            <span className="label">Name</span>
            <input name="displayName" defaultValue={s?.displayName} required className="input w-48" />
          </label>
          <label className="text-xs">
            <span className="label">Colour</span>
            <input type="color" name="calendarColor" defaultValue={s?.calendarColor ?? "#c65b86"} className="h-[42px] w-14 rounded-lg border border-line" />
          </label>
          <label className="text-xs">
            <span className="label">Order</span>
            <input name="sortOrder" type="number" defaultValue={s?.sortOrder ?? 0} className="input w-20" />
          </label>
          <label className="flex items-center gap-1.5 pb-2.5 text-sm"><input type="checkbox" name="isBookable" defaultChecked={s?.isBookable ?? true} className="accent-pink" /> Takes bookings</label>
        </div>
        <div className="text-xs">
          <span className="label">Services they do (none ticked = all services)</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {services.map((svc) => (
              <label key={svc.id} className="flex items-center gap-1">
                <input type="checkbox" name="serviceIds" value={svc.id} defaultChecked={linked.some((l) => l.serviceId === svc.id)} className="accent-pink" /> {svc.name}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-pale/60 p-3">
          {u ? (
            <p className="text-sm">Dashboard login: <b>{formatPhone(u.phone)}</b> ({u.role.toLowerCase()})</p>
          ) : (
            <>
              <label className="text-xs">
                <span className="label">Dashboard login (mobile, optional)</span>
                <input name="phone" type="tel" placeholder="98123 45678" className="input w-48" />
              </label>
              <label className="text-xs">
                <span className="label">Access</span>
                <select name="role" className="input w-40" defaultValue="STAFF">
                  <option value="STAFF">Staff (day-to-day)</option>
                  <option value="ADMIN">Admin (prices & settings)</option>
                </select>
              </label>
            </>
          )}
        </div>
        <Submit>{s ? "Save" : "Add staff member"}</Submit>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="h-display text-3xl">Staff</h1>
      <p className="text-sm text-muted">Each artist gets their own column in the calendar. Give someone a dashboard login by adding their mobile number — they log in with an OTP like customers.</p>
      {staff.map((s) => (
        <div key={s.id} className="card space-y-3 p-4">
          <ActionForm action={adminSaveStaff} className="space-y-3">
            <Fields s={s} />
          </ActionForm>
          {s.userId && users.find((u) => u.id === s.userId)?.role !== "OWNER" && (
            <form action={adminRemoveStaffLogin}>
              <input type="hidden" name="id" value={s.id} />
              <Submit className="btn-ghost btn-sm" confirm="Remove this person's dashboard access?">Remove dashboard access</Submit>
            </form>
          )}
        </div>
      ))}
      <div className="card space-y-3 p-4">
        <h2 className="font-serif text-lg text-plum">Add staff member</h2>
        <ActionForm action={adminSaveStaff} resetOnSuccess className="space-y-3">
          <Fields />
        </ActionForm>
      </div>
    </div>
  );
}

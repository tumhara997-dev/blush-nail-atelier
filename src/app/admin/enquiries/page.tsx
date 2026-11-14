import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminSetEnquiryStatus } from "@/actions/admin";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Enquiries" };

const STATUSES = ["NEW", "CONTACTED", "CONVERTED", "CLOSED", "SPAM"] as const;

export default async function EnquiriesPage() {
  const rows = await db().select().from(schema.enquiries).orderBy(desc(schema.enquiries.createdAt)).limit(200);
  return (
    <div className="space-y-4">
      <h1 className="h-display text-3xl">Enquiries</h1>
      <p className="text-sm text-muted">Questions sent from the Contact page.</p>
      {!rows.length && <p className="card p-5 text-sm text-muted">No enquiries yet.</p>}
      <ul className="space-y-3">
        {rows.map((e) => (
          <li key={e.id} className={`card p-4 ${e.status === "NEW" ? "border-pink" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-bold">{e.name} <span className="font-normal text-muted">· {formatPhone(e.phone)}</span></div>
                <div className="text-xs text-muted">{formatDateTime(e.createdAt)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={whatsappLink(e.phone, `Hi ${e.name}, thanks for contacting BLUSH! `)} target="_blank" rel="noopener" className="btn-outline btn-sm">Reply on WhatsApp</a>
                <form action={adminSetEnquiryStatus} className="flex gap-1">
                  <input type="hidden" name="id" value={e.id} />
                  <select name="status" defaultValue={e.status} className="input py-1.5 text-xs" aria-label="Status">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
                  </select>
                  <button className="btn-ghost btn-sm">Set</button>
                </form>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm">{e.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

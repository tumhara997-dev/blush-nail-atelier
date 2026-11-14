import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { listAppointments } from "@/server/queries";
import { AppointmentTable } from "@/components/admin/appointment-table";
import { ActionForm, Submit } from "@/components/forms";
import { adminUpdateCustomer } from "@/actions/admin";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [c] = await db().select().from(schema.users).where(eq(schema.users.id, id));
  if (!c) notFound();
  const appts = await listAppointments({ customerId: id, order: "desc" });

  return (
    <div className="space-y-5">
      <Link href="/admin/customers" className="text-sm text-rose">← Customers</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h-display text-3xl">{c.deletedAt ? "Deleted account" : c.name ?? "(no name)"}</h1>
          <p className="text-sm text-muted">
            {c.deletedAt ? "Personal data erased at the customer's request." : <>{formatPhone(c.phone)} {c.email && `· ${c.email}`} · customer since {formatDate(c.createdAt)}</>}
          </p>
        </div>
        {!c.deletedAt && (
          <div className="flex gap-2">
            <a href={`tel:${c.phone}`} className="btn-outline btn-sm">Call</a>
            <a href={whatsappLink(c.phone)} target="_blank" rel="noopener" className="btn-outline btn-sm">WhatsApp</a>
          </div>
        )}
      </div>

      {!c.deletedAt && c.role === "CUSTOMER" && (
        <ActionForm action={adminUpdateCustomer} className="card grid gap-3 p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={c.id} />
          {c.nailPrefs && <p className="text-sm sm:col-span-2"><span className="text-muted">Their preferences:</span> {c.nailPrefs}</p>}
          <div>
            <label className="label" htmlFor="c-allergies">Allergies / sensitivities</label>
            <input id="c-allergies" name="allergies" defaultValue={c.allergies ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="c-notes">Staff notes (private)</label>
            <textarea id="c-notes" name="staffNotes" defaultValue={c.staffNotes ?? ""} rows={2} className="input" placeholder="e.g. prefers Priya, sensitive cuticles" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isBlocked" defaultChecked={c.isBlocked} className="accent-pink" /> Block account (can&apos;t log in or book online)
          </label>
          <div className="sm:text-right"><Submit>Save</Submit></div>
        </ActionForm>
      )}

      <section>
        <h2 className="mb-3 font-serif text-xl text-plum">Appointments ({appts.length})</h2>
        <AppointmentTable rows={appts} />
      </section>
    </div>
  );
}

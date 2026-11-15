import { mediaUrl } from "@/lib/media-url";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getAppointmentDetail } from "@/server/queries";
import { StatusBadge } from "@/components/status-badge";
import { AdminAppointmentActions } from "@/components/admin/appointment-actions";
import { formatDateTime, formatShortDate, formatTime, salonDateString, salonMinutesOfDay, minutesToHm } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { STATUS_LABEL } from "@/lib/appointment-status";

export const metadata = { title: "Appointment" };

export default async function AdminAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const d = await getAppointmentDetail(id);
  if (!d) notFound();
  const staff = await db().select().from(schema.staff).orderBy(asc(schema.staff.sortOrder));
  const { a, customer } = d;
  const addOns = d.items.flatMap((i) => i.addOns);
  const itemTotal = d.items.reduce((s, i) => s + (i.price ?? 0), 0);

  return (
    <div className="space-y-5">
      <Link href="/admin/appointments" className="text-sm text-rose">← Appointments</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h-display text-3xl">{d.items.map((i) => i.name).join(" + ")}</h1>
          <p className="text-muted">{formatDateTime(a.startsAt)} – {formatTime(a.endsAt)} (incl. cleanup) · <span className="font-mono text-xs">{a.ref}</span></p>
        </div>
        <StatusBadge status={a.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="card p-5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted">Customer</dt>
              <dd>
                <Link href={`/admin/customers/${customer.id}`} className="font-bold text-rose hover:underline">{customer.name ?? "(no name)"}</Link>
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs">
                  <a href={`tel:${customer.phone}`} className="text-muted">{formatPhone(customer.phone)}</a>
                  {!customer.deletedAt && <a href={whatsappLink(customer.phone, `Hi ${customer.name ?? ""}, this is BLUSH about your booking ${a.ref}.`)} target="_blank" rel="noopener" className="font-bold text-emerald-700">WhatsApp</a>}
                </div>
              </dd>
              <dt className="text-muted">Artist</dt>
              <dd>{d.staff?.displayName ?? "—"}</dd>
              {addOns.length > 0 && (<><dt className="text-muted">Add-ons</dt><dd>{addOns.map((x) => `${x.name} (+${formatPaise(x.price)})`).join(", ")}</dd></>)}
              <dt className="text-muted">Price</dt>
              <dd>
                {a.finalTotal != null ? <>Final {formatPaise(a.finalTotal)}</> : a.quotedTotal != null ? <>Quoted {formatPaise(a.quotedTotal)}</> : itemTotal ? formatPaise(itemTotal) : a.estimateMin != null ? `From ${formatPaise(a.estimateMin)}` : "Not priced yet"}
              </dd>
              <dt className="text-muted">Source</dt>
              <dd className="capitalize">{a.source.toLowerCase().replace("_", "-")}</dd>
              {a.customerNote && (<><dt className="text-muted">Customer notes</dt><dd className="whitespace-pre-line">{a.customerNote}</dd></>)}
              {customer.allergies && (<><dt className="font-bold text-rose-700">Allergies</dt><dd className="font-bold text-rose-700">{customer.allergies}</dd></>)}
              {customer.nailPrefs && (<><dt className="text-muted">Preferences</dt><dd>{customer.nailPrefs}</dd></>)}
              {customer.staffNotes && (<><dt className="text-muted">Staff notes</dt><dd className="whitespace-pre-line">{customer.staffNotes}</dd></>)}
              {a.quoteNote && (<><dt className="text-muted">Quote note</dt><dd>{a.quoteNote}</dd></>)}
              {a.cancelReason && (<><dt className="text-muted">Cancel reason</dt><dd>{a.cancelReason}</dd></>)}
            </dl>
            {d.photos.length > 0 && (
              <div className="mt-4">
                <div className="label">Inspiration photos</div>
                <div className="flex flex-wrap gap-2">
                  {d.photos.map((p) => (
                    <a key={p.id} href={mediaUrl(p.id)} target="_blank" rel="noopener">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(p.id)} alt="Inspiration" className="h-32 w-32 rounded-xl object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-serif text-lg text-plum">History</h2>
            <ol className="space-y-2 text-sm">
              {d.events.map(({ e, actorName, actorRole }) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-28 shrink-0 text-xs text-muted">{formatShortDate(e.createdAt)} {formatTime(e.createdAt)}</span>
                  <span>
                    {e.fromStatus && e.fromStatus !== e.toStatus ? `${STATUS_LABEL[e.fromStatus]} → ` : ""}
                    <b>{STATUS_LABEL[e.toStatus]}</b>
                    {e.note && <span className="text-muted"> — {e.note}</span>}
                    <span className="text-xs text-muted"> · {actorName ?? (actorRole ? actorRole.toLowerCase() : "system")}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {d.history.length > 1 && (
            <div className="card p-5">
              <h2 className="mb-3 font-serif text-lg text-plum">Customer&apos;s other visits</h2>
              <ul className="space-y-1.5 text-sm">
                {d.history.filter((h) => h.id !== a.id).map((h) => (
                  <li key={h.id} className="flex justify-between gap-3">
                    <Link href={`/admin/appointments/${h.id}`} className="text-rose hover:underline">{formatDateTime(h.startsAt)}</Link>
                    <StatusBadge status={h.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <AdminAppointmentActions
          id={a.id}
          status={a.status}
          suggestedTotal={a.quotedTotal ?? (itemTotal || a.estimateMin) ?? null}
          staff={staff.map((s) => ({ id: s.id, name: s.displayName }))}
          current={{ date: salonDateString(a.startsAt), time: minutesToHm(salonMinutesOfDay(a.startsAt)), staffId: a.staffId }}
        />
      </div>
    </div>
  );
}

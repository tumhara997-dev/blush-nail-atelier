import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getCustomerAppointment } from "@/server/queries";
import { getSettings } from "@/server/settings";
import { StatusBadge } from "@/components/status-badge";
import { CustomerAppointmentActions } from "@/components/customer-appointment-actions";
import { formatDateTime } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { whatsappLink } from "@/lib/phone";

export default async function MyAppointmentPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const user = await requireUser(`/account/appointments/${ref}`);
  const a = await getCustomerAppointment(user.id, ref);
  if (!a) notFound();
  const { salon, booking } = await getSettings("salon", "booking");

  const hoursLeft = (a.startsAt.getTime() - Date.now()) / 3_600_000;
  const canCancel = ["REQUESTED", "QUOTED"].includes(a.status) || (a.status === "CONFIRMED" && hoursLeft >= booking.cancelWindowHours);
  const lateForCancel = a.status === "CONFIRMED" && hoursLeft < booking.cancelWindowHours && hoursLeft > 0;
  const price =
    a.finalTotal ?? a.quotedTotal ?? a.estimateMax ?? null;

  return (
    <div className="space-y-4">
      <Link href="/account" className="text-sm text-rose">← All appointments</Link>
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-plum">{a.items.map((i) => i.name).join(" + ")}</h2>
            <p className="text-muted">{formatDateTime(a.startsAt)}</p>
          </div>
          <StatusBadge status={a.status} />
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-muted">Reference</dt>
          <dd className="font-mono">{a.ref}</dd>
          {a.items.flatMap((i) => i.addOns).length > 0 && (
            <>
              <dt className="text-muted">Add-ons</dt>
              <dd>{a.items.flatMap((i) => i.addOns).map((x) => x.name).join(", ")}</dd>
            </>
          )}
          <dt className="text-muted">Price</dt>
          <dd>{price != null ? formatPaise(price) : a.estimateMin != null ? `From ${formatPaise(a.estimateMin)}` : "To be quoted"}</dd>
          {a.customerNote && (
            <>
              <dt className="text-muted">Your notes</dt>
              <dd className="whitespace-pre-line">{a.customerNote}</dd>
            </>
          )}
          {a.cancelReason && a.status === "CANCELLED" && (
            <>
              <dt className="text-muted">Reason</dt>
              <dd>{a.cancelReason}</dd>
            </>
          )}
        </dl>
        {a.photos.length > 0 && (
          <div className="mt-4 flex gap-2">
            {a.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={`/media/${p.id}`} alt="Inspiration" className="h-24 w-24 rounded-xl object-cover" />
            ))}
          </div>
        )}
      </div>

      {a.status === "QUOTED" && (
        <div className="card border-violet-200 bg-violet-50/60 p-5">
          <h3 className="font-serif text-xl text-plum">Your quote: {a.quotedTotal != null ? formatPaise(a.quotedTotal) : "—"}</h3>
          {a.quoteNote && <p className="mt-1 whitespace-pre-line text-sm text-[#5b4651]">{a.quoteNote}</p>}
          {a.quoteExpiresAt && <p className="mt-1 text-xs text-muted">Valid until {formatDateTime(a.quoteExpiresAt)}</p>}
        </div>
      )}

      <CustomerAppointmentActions refCode={a.ref} canCancel={canCancel} isQuoted={a.status === "QUOTED"} />

      {lateForCancel && salon.whatsapp && (
        <p className="text-sm text-muted">
          Need to change this appointment? It&apos;s within {booking.cancelWindowHours} hours, so please{" "}
          <a className="font-bold text-rose underline" href={whatsappLink(salon.whatsapp, `Hi! I need to change my booking ${a.ref}.`)} target="_blank" rel="noopener">message us on WhatsApp</a>.
        </p>
      )}
      {["REQUESTED", "QUOTED", "CONFIRMED"].includes(a.status) && salon.whatsapp && !lateForCancel && (
        <p className="text-sm text-muted">
          Want a different time? <a className="font-bold text-rose underline" href={whatsappLink(salon.whatsapp, `Hi! Can I move my booking ${a.ref}?`)} target="_blank" rel="noopener">Ask us on WhatsApp</a>.
        </p>
      )}
    </div>
  );
}

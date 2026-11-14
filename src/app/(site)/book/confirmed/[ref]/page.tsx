import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getCustomerAppointment } from "@/server/queries";
import { formatDateTime } from "@/lib/time";
import { STATUS_LABEL } from "@/lib/appointment-status";
import { getSettings } from "@/server/settings";
import { whatsappLink } from "@/lib/phone";
import { Bow } from "@/components/ornaments";

export default async function ConfirmedPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const user = await requireUser(`/book/confirmed/${ref}`);
  const appt = await getCustomerAppointment(user.id, ref);
  if (!appt) notFound();
  const { salon } = await getSettings("salon");
  const confirmed = appt.status === "CONFIRMED";

  return (
    <div className="mx-auto max-w-lg px-4 py-14 text-center">
      <Bow className="mx-auto h-8 w-12 text-gold" />
      <div className="eyebrow mt-5">{confirmed ? "Confirmed" : "Request received"}</div>
      <h1 className="h-display mt-3 text-[44px] leading-none">{confirmed ? <>You&apos;re <em className="font-normal text-rose">booked.</em></> : <>Request <em className="font-normal text-rose">sent.</em></>}</h1>
      <p className="mt-2 text-muted">
        {confirmed
          ? "We've sent the details to your WhatsApp. See you soon!"
          : "We'll review your request and confirm (with a price, if needed) on WhatsApp shortly."}
      </p>
      <div className="card mt-6 p-5 text-left text-sm">
        <div className="flex justify-between"><span className="text-muted">Reference</span><b className="font-mono">{appt.ref}</b></div>
        <div className="mt-1.5 flex justify-between gap-4"><span className="text-muted">Service</span><span className="text-right">{appt.items.map((i) => i.name).join(" + ")}</span></div>
        <div className="mt-1.5 flex justify-between"><span className="text-muted">When</span><span>{formatDateTime(appt.startsAt)}</span></div>
        <div className="mt-1.5 flex justify-between"><span className="text-muted">Status</span><span>{STATUS_LABEL[appt.status]}</span></div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/account/appointments/${appt.ref}`} className="btn-primary">View booking</Link>
        {salon.whatsapp && <a href={whatsappLink(salon.whatsapp, `Hi! About my booking ${appt.ref}…`)} target="_blank" rel="noopener" className="btn-outline">WhatsApp us</a>}
      </div>
    </div>
  );
}

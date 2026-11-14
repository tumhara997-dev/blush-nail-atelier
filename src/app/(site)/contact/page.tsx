import type { Metadata } from "next";
import { getSettings } from "@/server/settings";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { SectionHead } from "@/components/section-head";
import { EnquiryForm } from "@/components/enquiry-form";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { formatHm } from "@/lib/time";

export const metadata: Metadata = { title: "Contact & Directions" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function ContactPage() {
  const [{ salon }, hours] = await Promise.all([getSettings("salon"), db().select().from(schema.businessHours).orderBy(asc(schema.businessHours.weekday))]);
  const ordered = [...hours.slice(1), ...hours.slice(0, 1)]; // Monday first

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <SectionHead as="h1" eyebrow="Say hello" title="Contact & Directions" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div className="card space-y-2 p-5 text-sm">
            {salon.address ? <p className="whitespace-pre-line">{salon.address}</p> : <p className="text-muted">Address coming soon.</p>}
            {salon.phone && <p>Call: <a className="font-bold text-rose" href={`tel:${salon.phone}`}>{formatPhone(salon.phone)}</a></p>}
            {salon.whatsapp && <p>WhatsApp: <a className="font-bold text-rose" href={whatsappLink(salon.whatsapp)} target="_blank" rel="noopener">{formatPhone(salon.whatsapp)}</a></p>}
            {salon.email && <p>Email: <a className="font-bold text-rose" href={`mailto:${salon.email}`}>{salon.email}</a></p>}
            {salon.instagram && <p>Instagram: <a className="font-bold text-rose" href={salon.instagram} target="_blank" rel="noopener">{salon.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")}</a></p>}
            {salon.mapLink && <a href={salon.mapLink} target="_blank" rel="noopener" className="btn-outline btn-sm mt-2">Open in Google Maps</a>}
          </div>
          <div className="card p-5">
            <h2 className="font-serif text-lg text-plum">Opening hours</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {ordered.map((h) => (
                  <tr key={h.weekday} className="border-b border-line/60 last:border-0">
                    <td className="py-1.5">{DAYS[h.weekday]}</td>
                    <td className="py-1.5 text-right text-muted">{h.isClosed ? "Closed" : `${formatHm(h.openTime)} – ${formatHm(h.closeTime)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-6">
          {salon.mapEmbedUrl && (
            <iframe title="Map" src={salon.mapEmbedUrl} className="h-64 w-full rounded-2xl border border-line" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          )}
          <div className="card p-5">
            <h2 className="mb-3 font-serif text-lg text-plum">Send us a question</h2>
            <EnquiryForm />
          </div>
        </div>
      </div>
    </div>
  );
}

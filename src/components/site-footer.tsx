import Link from "next/link";
import type { SalonSettings } from "@/server/settings";
import { formatPhone, whatsappLink } from "@/lib/phone";

export function SiteFooter({ salon }: { salon: SalonSettings }) {
  return (
    <footer className="mt-10 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted sm:grid-cols-3 sm:px-6">
        <div>
          <div className="font-serif text-xl font-bold tracking-[4px] text-rose">{salon.name}</div>
          <p className="mt-2">{salon.tagline}</p>
          {salon.address && <p className="mt-2 whitespace-pre-line">{salon.address}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-bold text-ink">Visit</span>
          <Link href="/services" className="hover:text-pink">Services & prices</Link>
          <Link href="/book" className="hover:text-pink">Book an appointment</Link>
          <Link href="/account" className="hover:text-pink">My appointments</Link>
          <Link href="/contact" className="hover:text-pink">Contact & directions</Link>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-bold text-ink">Contact</span>
          {salon.phone && <a href={`tel:${salon.phone}`} className="hover:text-pink">{formatPhone(salon.phone)}</a>}
          {salon.whatsapp && <a href={whatsappLink(salon.whatsapp)} className="hover:text-pink" rel="noopener" target="_blank">WhatsApp us</a>}
          {salon.instagram && <a href={salon.instagram} className="hover:text-pink" rel="noopener" target="_blank">Instagram</a>}
          <Link href="/policies/privacy" className="hover:text-pink">Privacy policy</Link>
          <Link href="/policies/cancellation" className="hover:text-pink">Cancellation policy</Link>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-[#947b86]">© {new Date().getFullYear()} {salon.name} • Nail Services & Art</p>
    </footer>
  );
}

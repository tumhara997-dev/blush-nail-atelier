import Link from "next/link";
import type { SalonSettings } from "@/server/settings";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { Bow } from "./ornaments";

export function SiteFooter({ salon }: { salon: SalonSettings }) {
  const col = "flex flex-col gap-2.5 text-[14px]";
  const head = "mb-2 text-[11px] uppercase tracking-[0.24em] text-gold";
  return (
    <footer className="mt-24 bg-plum text-[#ecdcd6]">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-16 sm:px-8">
        <div className="flex flex-col items-center text-center">
          <Bow className="h-7 w-11 text-gold" />
          <div className="mt-4 font-serif text-[56px] font-medium leading-none tracking-[0.3em] text-[#f6e8e5] sm:text-[80px]">{salon.name}</div>
          <p className="mt-3 font-serif text-xl italic text-[#d9c2bb]">little details, beautifully done</p>
          <Link href="/book" className="btn mt-8 bg-[#f6e8e5] text-plum hover:bg-white">Book your appointment</Link>
        </div>

        <div className="mt-16 grid gap-10 border-t border-white/10 pt-10 sm:grid-cols-3">
          <div className={col}>
            <div className={head}>Visit</div>
            {salon.address ? <p className="whitespace-pre-line leading-6">{salon.address}</p> : <p>By appointment</p>}
            <Link href="/contact" className="hover:text-white">Hours & directions</Link>
          </div>
          <div className={col}>
            <div className={head}>Explore</div>
            <Link href="/services" className="hover:text-white">Menu & prices</Link>
            <Link href="/bridal" className="hover:text-white">Bridal & festive</Link>
            <Link href="/gallery" className="hover:text-white">Gallery</Link>
            <Link href="/account" className="hover:text-white">My appointments</Link>
          </div>
          <div className={col}>
            <div className={head}>Say hello</div>
            {salon.whatsapp && <a href={whatsappLink(salon.whatsapp)} target="_blank" rel="noopener" className="hover:text-white">WhatsApp {formatPhone(salon.whatsapp)}</a>}
            {salon.phone && <a href={`tel:${salon.phone}`} className="hover:text-white">Call {formatPhone(salon.phone)}</a>}
            {salon.instagram && <a href={salon.instagram} target="_blank" rel="noopener" className="hover:text-white">Instagram</a>}
            {salon.email && <a href={`mailto:${salon.email}`} className="hover:text-white">{salon.email}</a>}
            <Link href="/contact" className="hover:text-white">Send us a message</Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[11px] uppercase tracking-[0.18em] text-[#b9a29c] sm:flex-row">
          <span>© {new Date().getFullYear()} {salon.name} Nail Atelier</span>
          <span className="flex gap-6">
            <Link href="/policies/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/policies/cancellation" className="hover:text-white">Cancellation</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

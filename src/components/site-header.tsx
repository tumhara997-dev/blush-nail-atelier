import Link from "next/link";
import { getCurrentUser, isStaff } from "@/server/auth";

const LEFT = [
  { href: "/services", label: "Menu" },
  { href: "/nail-art", label: "Nail Art" },
  { href: "/gallery", label: "Gallery" },
];
const RIGHT = [
  { href: "/bridal", label: "Bridal" },
  { href: "/contact", label: "Visit" },
];

export async function SiteHeader({ salonName, announcement }: { salonName: string; announcement?: string }) {
  const user = await getCurrentUser();
  const accountHref = user ? (isStaff(user) ? "/admin" : "/account") : "/login";
  const accountLabel = user ? (isStaff(user) ? "Dashboard" : "My account") : "Sign in";
  const navCls = "text-[12px] uppercase tracking-[0.18em] text-ink/80 transition hover:text-rose";

  return (
    <>
      {announcement && (
        <div className="bg-plum px-4 py-2 text-center text-[11px] uppercase tracking-[0.2em] text-[#f3e3dc]">
          <Link href="/bridal" className="hover:text-white">{announcement}</Link>
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-4 sm:px-8">
          <nav aria-label="Main" className="hidden gap-8 lg:flex">
            {LEFT.map((n) => <Link key={n.href} href={n.href} className={navCls}>{n.label}</Link>)}
            {RIGHT.map((n) => <Link key={n.href} href={n.href} className={navCls}>{n.label}</Link>)}
          </nav>

          {/* Mobile menu (no JS) */}
          <details className="group relative lg:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-plum hover:bg-pale [&::-webkit-details-marker]:hidden" aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden><path d="M4 8h16M4 16h16" /></svg>
            </summary>
            <div className="card absolute left-0 mt-3 flex w-60 flex-col p-3 shadow-[0_24px_60px_-20px_#4a162840]">
              {[...LEFT, ...RIGHT].map((n) => (
                <Link key={n.href} href={n.href} className="rounded-xl px-4 py-3 font-serif text-xl text-plum hover:bg-pale">{n.label}</Link>
              ))}
              <Link href={accountHref} className="mt-1 rounded-xl px-4 py-3 text-[12px] uppercase tracking-[0.18em] text-rose hover:bg-pale">{accountLabel}</Link>
            </div>
          </details>

          <Link href="/" className="flex flex-col items-center leading-none" aria-label={`${salonName} home`}>
            <span className="font-serif text-[30px] font-medium tracking-[0.32em] text-plum sm:text-[34px]">{salonName}</span>
            <span className="mt-1 text-[9px] uppercase tracking-[0.5em] text-gold">Nail Atelier</span>
          </Link>

          <div className="flex items-center justify-end gap-5">
            <Link href={accountHref} className={`${navCls} hidden sm:inline`}>{accountLabel}</Link>
            <Link href="/book" className="btn-primary btn-sm">Book</Link>
          </div>
        </div>
      </header>
    </>
  );
}

import Link from "next/link";
import { getCurrentUser, isStaff } from "@/server/auth";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/nail-art", label: "Nail Art" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader({ salonName }: { salonName: string }) {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="font-serif text-2xl font-bold tracking-[5px] text-rose sm:text-[28px]">
          {salonName}
        </Link>
        <nav aria-label="Main" className="hidden gap-6 text-sm text-[#684b58] md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-pink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href={isStaff(user) ? "/admin" : "/account"} className="btn-outline btn-sm hidden sm:inline-flex">
              {isStaff(user) ? "Dashboard" : "My account"}
            </Link>
          ) : (
            <Link href="/login" className="btn-outline btn-sm hidden sm:inline-flex">
              Log in
            </Link>
          )}
          <Link href="/book" className="btn-primary btn-sm sm:px-5 sm:py-2.5 sm:text-sm">
            Book now
          </Link>
          {/* Mobile menu: native <details>, works without JavaScript */}
          <details className="group relative md:hidden">
            <summary className="btn-ghost btn-sm cursor-pointer list-none px-2.5 [&::-webkit-details-marker]:hidden" aria-label="Menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <div className="card absolute right-0 mt-2 flex w-52 flex-col p-2 shadow-xl">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2.5 text-sm hover:bg-pale">
                  {n.label}
                </Link>
              ))}
              <Link href={user ? (isStaff(user) ? "/admin" : "/account") : "/login"} className="rounded-lg px-3 py-2.5 text-sm font-bold text-rose hover:bg-pale">
                {user ? (isStaff(user) ? "Dashboard" : "My account") : "Log in"}
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

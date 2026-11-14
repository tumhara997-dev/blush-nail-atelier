import Link from "next/link";
import { isAdmin, requireStaff } from "@/server/auth";
import { logout } from "@/actions/auth";
import { getSettings } from "@/server/settings";

export const metadata = { title: { default: "Dashboard", template: "%s · BLUSH admin" }, robots: { index: false } };

const STAFF_NAV = [
  { href: "/admin", label: "Today" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/appointments/new", label: "+ New booking" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/schedule", label: "Time off & hours" },
];
const ADMIN_NAV = [
  { href: "/admin/services", label: "Services & prices" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const { salon } = await getSettings("salon");
  const nav = isAdmin(user) ? [...STAFF_NAV, ...ADMIN_NAV] : STAFF_NAV;
  return (
    <div className="min-h-screen bg-[#fdf7f9] md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-line bg-white md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link href="/admin" className="font-serif text-xl font-bold tracking-[4px] text-rose">{salon.name}</Link>
          <div className="text-xs text-muted md:mt-1">{user.name} · {user.role.toLowerCase()}</div>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-[#5b4651] hover:bg-pale hover:text-rose">
              {n.label}
            </Link>
          ))}
          <div className="md:mt-4 md:border-t md:border-line md:pt-3" />
          <Link href="/" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted hover:bg-pale">View website ↗</Link>
          <form action={logout}>
            <button className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-pale">Log out</button>
          </form>
        </nav>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

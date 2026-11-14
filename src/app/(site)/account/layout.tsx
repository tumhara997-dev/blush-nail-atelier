import Link from "next/link";
import { requireUser, isStaff } from "@/server/auth";
import { logout } from "@/actions/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">My account</div>
          <h1 className="h-display mt-1 text-[40px] leading-none">Hello, <em className="font-normal text-rose">{user.name?.split(" ")[0] ?? "there"}</em></h1>
        </div>
        <nav aria-label="Account" className="flex flex-wrap items-center gap-2">
          <Link href="/account" className="btn-ghost btn-sm">Appointments</Link>
          <Link href="/account/profile" className="btn-ghost btn-sm">Profile</Link>
          {isStaff(user) && <Link href="/admin" className="btn-outline btn-sm">Salon dashboard</Link>}
          <form action={logout}>
            <button className="btn-ghost btn-sm">Log out</button>
          </form>
        </nav>
      </div>
      {children}
    </div>
  );
}

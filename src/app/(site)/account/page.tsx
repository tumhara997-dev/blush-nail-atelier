import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listCustomerAppointments } from "@/server/queries";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/time";
import { ACTIVE_STATUSES } from "@/lib/appointment-status";

export const metadata = { title: "My appointments" };

export default async function AccountPage() {
  const user = await requireUser();
  const all = await listCustomerAppointments(user.id);
  const now = Date.now();
  const upcoming = all.filter((a) => ACTIVE_STATUSES.includes(a.status) && a.endsAt.getTime() > now).reverse();
  const past = all.filter((a) => !upcoming.includes(a));
  const needsAction = upcoming.filter((a) => a.status === "QUOTED");

  const Row = ({ a }: { a: (typeof all)[number] }) => (
    <li>
      <Link href={`/account/appointments/${a.ref}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-pale/60">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-plum">{a.items.map((i) => i.name).join(" + ")}</div>
          <div className="text-sm text-muted">{formatDateTime(a.startsAt)} · <span className="font-mono text-xs">{a.ref}</span></div>
        </div>
        <StatusBadge status={a.status} />
      </Link>
    </li>
  );

  return (
    <div className="space-y-8">
      {needsAction.length > 0 && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          You have {needsAction.length} quote{needsAction.length > 1 ? "s" : ""} waiting for your answer.{" "}
          <Link className="font-bold underline" href={`/account/appointments/${needsAction[0].ref}`}>Review now →</Link>
        </div>
      )}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl text-plum">Upcoming</h2>
          <Link href="/book" className="btn-primary btn-sm">New booking</Link>
        </div>
        {upcoming.length ? (
          <ul className="card divide-y divide-line overflow-hidden">{upcoming.map((a) => <Row key={a.id} a={a} />)}</ul>
        ) : (
          <div className="card p-6 text-center text-sm text-muted">No upcoming appointments. <Link href="/book" className="font-bold text-rose">Book one now →</Link></div>
        )}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl text-plum">History</h2>
          <ul className="card divide-y divide-line overflow-hidden">{past.map((a) => <Row key={a.id} a={a} />)}</ul>
        </section>
      )}
    </div>
  );
}

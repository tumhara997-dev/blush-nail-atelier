import Link from "next/link";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatPhone } from "@/lib/phone";
import { formatShortDate } from "@/lib/time";
import { formatPaise } from "@/lib/money";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: raw } = await searchParams;
  const q = raw?.trim().replace(/[%_]/g, "").slice(0, 60);
  const U = schema.users;
  const A = schema.appointments;

  const rows = await db()
    .select({
      id: U.id, name: U.name, phone: U.phone, isBlocked: U.isBlocked, createdAt: U.createdAt,
      visits: sql<number>`count(${A.id}) filter (where ${A.status} = 'COMPLETED')`.mapWith(Number),
      noShows: sql<number>`count(${A.id}) filter (where ${A.status} = 'NO_SHOW')`.mapWith(Number),
      spent: sql<number>`coalesce(sum(${A.finalTotal}) filter (where ${A.status} = 'COMPLETED'), 0)`.mapWith(Number),
      lastVisit: sql<Date | null>`max(${A.startsAt}) filter (where ${A.status} = 'COMPLETED')`,
    })
    .from(U)
    .leftJoin(A, eq(A.customerId, U.id))
    .where(and(eq(U.role, "CUSTOMER"), isNull(U.deletedAt), q ? or(ilike(U.name, `%${q}%`), ilike(U.phone, `%${q}%`)) : undefined))
    .groupBy(U.id)
    .orderBy(desc(U.createdAt))
    .limit(200);

  return (
    <div className="space-y-4">
      <h1 className="h-display text-3xl">Customers</h1>
      <form action="/admin/customers" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or phone" className="input max-w-xs" aria-label="Search customers" />
        <button className="btn-outline btn-sm">Search</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table min-w-[640px]">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Visits</th><th>Spent</th><th>Last visit</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-pale/50">
                <td>
                  <Link href={`/admin/customers/${c.id}`} className="font-bold text-rose hover:underline">{c.name ?? "(no name)"}</Link>
                  {c.isBlocked && <span className="ml-2 rounded bg-rose-100 px-1.5 text-[10px] font-bold text-rose-800">BLOCKED</span>}
                  {c.noShows > 0 && <span className="ml-2 text-[11px] text-rose-700">{c.noShows} no-show</span>}
                </td>
                <td className="whitespace-nowrap">{formatPhone(c.phone)}</td>
                <td>{c.visits}</td>
                <td>{c.spent ? formatPaise(c.spent) : "—"}</td>
                <td>{c.lastVisit ? formatShortDate(new Date(c.lastVisit)) : "—"}</td>
                <td>{formatShortDate(c.createdAt)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="text-muted">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

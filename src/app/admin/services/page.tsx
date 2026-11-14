import { requireStaff } from "@/server/auth";
import { getCatalog } from "@/server/catalog";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { adminAddVariant, adminDeleteVariant, adminSaveAddOn, adminSaveService } from "@/actions/admin";
import { ActionForm, Submit } from "@/components/forms";
import { formatPaise, paiseToRupeesInput } from "@/lib/money";

export const metadata = { title: "Services & prices" };

type Svc = Awaited<ReturnType<typeof getCatalog>>[number]["services"][number];
type Cat = { id: string; name: string };

function ServiceFields({ s, cats }: { s?: Svc; cats: Cat[] }) {
  return (
    <>
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-2 sm:grid-cols-[60px_1fr_1fr]">
        <input name="emoji" defaultValue={s?.emoji ?? ""} className="input text-center" aria-label="Emoji" placeholder="💅" maxLength={4} />
        <input name="name" defaultValue={s?.name} required className="input" aria-label="Name" placeholder="Service name" />
        <select name="categoryId" defaultValue={s?.categoryId ?? cats[0]?.id} className="input" aria-label="Category">
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <input name="summary" defaultValue={s?.summary} required className="input" aria-label="Short description" placeholder="Short description shown to customers" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <label className="text-xs">
          <span className="label">Price type</span>
          <select name="priceType" defaultValue={s?.priceType ?? "FROM"} className="input py-1.5">
            <option value="FIXED">Fixed</option>
            <option value="FROM">Starting from</option>
            <option value="ON_ENQUIRY">On enquiry</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="label">Price ₹</span>
          <input name="basePrice" inputMode="decimal" defaultValue={paiseToRupeesInput(s?.basePrice)} className="input py-1.5" />
        </label>
        <label className="text-xs">
          <span className="label">Minutes</span>
          <input name="durationMin" type="number" min={5} defaultValue={s?.durationMin ?? 60} className="input py-1.5" />
        </label>
        <label className="text-xs">
          <span className="label">Cleanup min</span>
          <input name="bufferMin" type="number" min={0} defaultValue={s?.bufferMin ?? 15} className="input py-1.5" />
        </label>
        <label className="text-xs">
          <span className="label">Booking</span>
          <select name="bookingMode" defaultValue={s?.bookingMode ?? "INSTANT"} className="input py-1.5">
            <option value="INSTANT">Instant</option>
            <option value="REQUEST">Request + quote</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="label">Order</span>
          <input name="sortOrder" type="number" defaultValue={s?.sortOrder ?? 0} className="input py-1.5" />
        </label>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={s?.isActive ?? true} className="accent-pink" /> Visible & bookable</label>
        <Submit>{s ? "Save" : "Add service"}</Submit>
      </div>
    </>
  );
}

export default async function AdminServicesPage() {
  await requireStaff("admin");
  const [catalog, addOns, links] = await Promise.all([
    getCatalog({ includeInactive: true }),
    db().select().from(schema.addOns).orderBy(asc(schema.addOns.sortOrder), asc(schema.addOns.name)),
    db().select().from(schema.serviceAddOns),
  ]);
  const cats = catalog.map((c) => ({ id: c.id, name: c.name }));
  const services = catalog.flatMap((c) => c.services);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h-display text-3xl">Services & prices</h1>
        <p className="text-sm text-muted">
          <b>Instant</b> services are confirmed straight away. <b>Request + quote</b> services wait for you to send a price.
          Add <b>lengths/sizes</b> (e.g. Short / Medium / Long) when price and time depend on them — customers must pick one.
        </p>
      </div>

      {catalog.map((cat) => (
        <section key={cat.id} className="space-y-3">
          <h2 className="font-serif text-xl text-plum">{cat.name}</h2>
          {cat.services.map((s) => (
            <div key={s.id} className={`card space-y-3 p-4 ${s.isActive ? "" : "opacity-60"}`}>
              <ActionForm action={adminSaveService} className="space-y-2">
                <ServiceFields s={s} cats={cats} />
              </ActionForm>
              <details className="rounded-xl bg-pale/60 p-3 text-sm">
                <summary className="cursor-pointer font-bold text-rose">Lengths / sizes ({s.variants.filter((v) => v.isActive).length})</summary>
                <ul className="mt-2 space-y-1">
                  {s.variants.filter((v) => v.isActive).map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-2">
                      <span>{v.name} — {formatPaise(v.price)} · {v.durationMin} min</span>
                      <form action={adminDeleteVariant}>
                        <input type="hidden" name="id" value={v.id} />
                        <button className="btn-ghost btn-sm">Remove</button>
                      </form>
                    </li>
                  ))}
                </ul>
                <form action={adminAddVariant} className="mt-2 flex flex-wrap gap-2">
                  <input type="hidden" name="serviceId" value={s.id} />
                  <input name="name" placeholder="e.g. Medium" required className="input w-32 py-1.5" aria-label="Variant name" />
                  <input name="price" placeholder="₹ price" required inputMode="decimal" className="input w-28 py-1.5" aria-label="Variant price" />
                  <input name="durationMin" type="number" placeholder="min" defaultValue={s.durationMin} className="input w-24 py-1.5" aria-label="Variant minutes" />
                  <button className="btn-outline btn-sm">Add</button>
                </form>
              </details>
            </div>
          ))}
        </section>
      ))}

      <section className="card space-y-2 p-4">
        <h2 className="font-serif text-xl text-plum">Add a new service</h2>
        <ActionForm action={adminSaveService} resetOnSuccess className="space-y-2">
          <ServiceFields cats={cats} />
        </ActionForm>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-plum">Add-ons</h2>
        <p className="text-sm text-muted">Optional extras customers can tick when booking (e.g. chrome finish, stones, removal of old set). Choose which services each add-on appears on.</p>
        {[...addOns, null].map((a) => (
          <form key={a?.id ?? "new"} action={adminSaveAddOn} className={`card space-y-2 p-4 ${a && !a.isActive ? "opacity-60" : ""}`}>
            {a && <input type="hidden" name="id" value={a.id} />}
            <div className="flex flex-wrap gap-2">
              <input name="name" defaultValue={a?.name} placeholder={a ? "" : "New add-on name"} required className="input w-56" aria-label="Add-on name" />
              <input name="price" defaultValue={paiseToRupeesInput(a?.price)} placeholder="₹ price" required inputMode="decimal" className="input w-28" aria-label="Add-on price" />
              <input name="durationMin" type="number" defaultValue={a?.durationMin ?? 0} className="input w-24" aria-label="Extra minutes" title="Extra minutes" />
              {a && <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="isActive" defaultChecked={a.isActive} className="accent-pink" /> Active</label>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-1">
                  <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={!!a && links.some((l) => l.addOnId === a.id && l.serviceId === s.id)} className="accent-pink" />
                  {s.name}
                </label>
              ))}
            </div>
            <Submit className="btn-outline btn-sm">{a ? "Save" : "Add add-on"}</Submit>
          </form>
        ))}
      </section>
    </div>
  );
}

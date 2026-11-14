import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/server/catalog";
import { formatPaise, priceLabel } from "@/lib/money";
import { SectionHead } from "@/components/section-head";

export const metadata: Metadata = { title: "Services & Prices", description: "Acrylic, gel and soft gel extensions, gel polish, nail art, refills and removal — prices and durations." };

export default async function ServicesPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <SectionHead as="h1" eyebrow="Our menu" title="Services & Prices">
        Final pricing for extensions and art depends on length, design and products — we always confirm before starting.
      </SectionHead>
      <div className="space-y-10">
        {catalog.map((cat) => (
          <section key={cat.id} aria-labelledby={`cat-${cat.slug}`}>
            <h2 id={`cat-${cat.slug}`} className="h-display mb-3 text-2xl">{cat.name}</h2>
            <ul className="card divide-y divide-line">
              {cat.services.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="text-2xl" aria-hidden>{s.emoji ?? "💅"}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-plum">{s.name}</h3>
                    <p className="text-sm text-muted">{s.summary}</p>
                    {s.variants.length > 0 && (
                      <p className="mt-1 text-xs text-muted">
                        {s.variants.map((v) => `${v.name} ${formatPaise(v.price)}`).join(" · ")}
                      </p>
                    )}
                    {s.addOns.length > 0 && (
                      <p className="mt-1 text-xs text-muted">Add-ons: {s.addOns.map((a) => `${a.name} +${formatPaise(a.price)}`).join(" · ")}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                    <span className="text-sm font-bold text-rose">{priceLabel(s)}</span>
                    <span className="text-xs text-muted">~{s.durationMin} min</span>
                    <Link href={`/book?service=${s.id}`} className="btn-outline btn-sm">
                      {s.bookingMode === "REQUEST" ? "Request quote" : "Book"}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { formatPaise } from "@/lib/money";
import type { CatalogCategory } from "@/server/catalog";

function price(s: CatalogCategory["services"][number]): string {
  if (s.variants.length) return `from ${formatPaise(Math.min(...s.variants.map((v) => v.price)))}`;
  if (s.priceType === "ON_ENQUIRY" || s.basePrice == null) return "on consultation";
  return s.priceType === "FROM" ? `from ${formatPaise(s.basePrice)}` : formatPaise(s.basePrice);
}

/** Printed-salon-menu style list with dotted leaders. */
export function MenuList({ categories }: { categories: CatalogCategory[] }) {
  return (
    <div className="grid gap-x-16 gap-y-14 md:grid-cols-2">
      {categories.map((cat) => (
        <section key={cat.id} aria-labelledby={`m-${cat.slug}`}>
          <h3 id={`m-${cat.slug}`} className="mb-6 flex items-center gap-4 text-[11px] uppercase tracking-[0.28em] text-gold">
            {cat.name}
            <span className="h-px flex-1 bg-gold/30" aria-hidden />
          </h3>
          <ul className="space-y-7">
            {cat.services.map((s) => (
              <li key={s.id}>
                <Link href={`/book?service=${s.id}`} className="group block">
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-[24px] leading-tight text-plum transition group-hover:text-rose">{s.name}</span>
                    <span className="mb-1.5 flex-1 border-b border-dotted border-muted/40" aria-hidden />
                    <span className="whitespace-nowrap text-[13px] uppercase tracking-[0.1em] text-ink">{price(s)}</span>
                  </div>
                  <p className="mt-1.5 text-[14px] leading-6 text-muted">
                    {s.summary} <span className="whitespace-nowrap text-[12px] text-muted/80">· ~{s.durationMin} min</span>
                    {s.bookingMode === "REQUEST" && <span className="ml-2 whitespace-nowrap text-[11px] uppercase tracking-[0.14em] text-rose">· quote first</span>}
                  </p>
                  {s.variants.length > 0 && (
                    <p className="mt-1 text-[13px] text-muted">{s.variants.map((v) => `${v.name} ${formatPaise(v.price)}`).join("  ·  ")}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

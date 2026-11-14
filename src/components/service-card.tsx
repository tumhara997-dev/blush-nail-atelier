import Link from "next/link";
import { priceLabel } from "@/lib/money";

type S = { id: string; name: string; summary: string; emoji: string | null; priceType: string; basePrice: number | null; durationMin: number; bookingMode: string };

export function ServiceCard({ s }: { s: S }) {
  return (
    <div className="card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_#a7436e1a]">
      <div className="grid h-28 place-items-center bg-gradient-to-br from-[#f8dce7] to-[#f3c4d6] text-4xl" aria-hidden>
        {s.emoji ?? "💅"}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg text-plum">{s.name}</h3>
        <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{s.summary}</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="font-bold text-rose">{priceLabel(s)}</span>
          <span className="text-muted">~{s.durationMin} min</span>
        </div>
        <Link href={`/book?service=${s.id}`} className="btn-outline btn-sm mt-3">
          {s.bookingMode === "REQUEST" ? "Request a quote" : "Book"}
        </Link>
      </div>
    </div>
  );
}

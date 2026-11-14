import Link from "next/link";

type Item = { id: string; caption: string; mediaId: string; width: number | null; height: number | null };

/** Editorial masonry gallery. Each photo can start a booking with itself as the reference. */
export function GalleryGrid({ items, customServiceId }: { items: Item[]; customServiceId?: string }) {
  if (!items.length) return <p className="text-center text-muted">New photos coming soon.</p>;
  return (
    <div className="columns-2 gap-4 sm:gap-5 md:columns-3 lg:columns-4">
      {items.map((g, i) => (
        <figure key={g.id} className="group relative mb-4 break-inside-avoid overflow-hidden sm:mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- already resized & re-encoded on upload */}
          <img
            src={`/media/${g.mediaId}`}
            alt={g.caption}
            width={g.width ?? 900}
            height={g.height ?? 1200}
            loading="lazy"
            decoding="async"
            className={`block w-full object-cover transition duration-700 group-hover:scale-[1.03] ${i % 5 === 0 ? "arch" : "rounded-[22px]"}`}
          />
          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 rounded-b-[22px] bg-gradient-to-t from-plum/75 via-plum/20 to-transparent p-4 pt-16 opacity-100 transition duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <span className={`font-serif text-lg leading-tight text-white ${customServiceId ? "mb-9 md:mb-0 md:pr-28" : ""}`}>{g.caption}</span>
          </figcaption>
          {customServiceId && (
            <Link
              href={`/book?service=${customServiceId}&look=${g.id}`}
              className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-plum shadow-sm transition hover:bg-white md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
            >
              Book this look
            </Link>
          )}
        </figure>
      ))}
    </div>
  );
}

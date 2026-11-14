type Item = { id: string; caption: string; mediaId: string; width: number | null; height: number | null };

export function GalleryGrid({ items }: { items: Item[] }) {
  if (!items.length) return <p className="text-center text-sm text-muted">New photos coming soon.</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {items.map((g) => (
        <figure key={g.id} className="card m-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- already resized & re-encoded on upload */}
          <img
            src={`/media/${g.mediaId}`}
            alt={g.caption}
            width={g.width ?? 900}
            height={g.height ?? 1200}
            loading="lazy"
            decoding="async"
            className="block h-44 w-full object-cover sm:h-56 md:h-64"
          />
          <figcaption className="px-3 py-2.5 text-xs text-[#71475a]">{g.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

import Link from "next/link";

type Style = { id: string; name: string; slug: string; coverMediaId: string | null };

export function ArtStyleGrid({ styles }: { styles: Style[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {styles.map((s, i) => (
        <Link
          key={s.id}
          href={`/gallery?style=${s.slug}`}
          className={`group relative flex h-36 items-end overflow-hidden rounded-2xl p-3.5 ${i % 2 ? "bg-gradient-to-br from-[#f5e8e0] to-[#d9b8b1]" : "bg-gradient-to-br from-[#f8dce7] to-[#dca4ba]"}`}
        >
          {s.coverMediaId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/media/${s.coverMediaId}`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          )}
          <span className="relative rounded-full bg-white/85 px-3 py-1.5 text-xs font-bold text-[#61354a]">{s.name}</span>
        </Link>
      ))}
    </div>
  );
}

import Link from "next/link";

type Style = { id: string; name: string; slug: string; coverMediaId: string | null };

/** Arch-framed cards for styles that have a real photo; the rest are listed as text links (no empty placeholders). */
export function ArtStyleGrid({ styles }: { styles: Style[] }) {
  const withPhoto = styles.filter((s) => s.coverMediaId);
  const rest = styles.filter((s) => !s.coverMediaId);
  return (
    <>
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {withPhoto.map((s) => (
          <Link key={s.id} href={`/gallery?style=${s.slug}`} className="group text-center">
            <div className="arch aspect-[3/4] overflow-hidden bg-pale">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${s.coverMediaId}`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            </div>
            <div className="mt-4 font-serif text-[22px] text-plum transition group-hover:text-rose">{s.name}</div>
          </Link>
        ))}
      </div>
      {rest.length > 0 && (
        <div className="mt-16 border-t border-line pt-10 text-center">
          <div className="eyebrow">We also do</div>
          <ul className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-3">
            {rest.map((s) => (
              <li key={s.id}>
                <Link href={`/gallery?style=${s.slug}`} className="font-serif text-[24px] italic text-plum hover:text-rose">{s.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

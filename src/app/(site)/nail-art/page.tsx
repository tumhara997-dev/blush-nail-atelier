import type { Metadata } from "next";
import Link from "next/link";
import { getArtStyles } from "@/server/gallery";
import { ArtStyleGrid } from "@/components/art-style-grid";
import { SectionTitle } from "@/components/ornaments";

export const metadata: Metadata = { title: "Nail Art Styles", description: "French, chrome, ombré, cat eye, 3D & bridal, foil, stones, animal print, spider gel and custom nail art." };

export default async function NailArtPage() {
  const styles = await getArtStyles();
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <SectionTitle as="h1" eyebrow="Make it yours" title={<>Nail art <em className="font-normal text-rose">styles</em></>}>
        Tap a style to see our real work. Have your own idea? Request a custom design and attach your inspiration.
      </SectionTitle>
      <ArtStyleGrid styles={styles} />
      <div className="mt-14 text-center">
        <Link href="/book" className="btn-primary">Request a custom design</Link>
      </div>
    </div>
  );
}

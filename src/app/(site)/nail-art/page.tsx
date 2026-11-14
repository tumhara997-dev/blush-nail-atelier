import type { Metadata } from "next";
import Link from "next/link";
import { getArtStyles } from "@/server/gallery";
import { ArtStyleGrid } from "@/components/art-style-grid";
import { SectionHead } from "@/components/section-head";

export const metadata: Metadata = { title: "Nail Art Styles", description: "French, chrome, ombre, cat eye, 3D & bridal, foil, stones, animal print, spider gel and custom nail art." };

export default async function NailArtPage() {
  const styles = await getArtStyles();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHead as="h1" eyebrow="Make it yours" title="Nail Art Styles">Tap a style to see our real work. Have your own idea? Request a custom design and attach photos.</SectionHead>
      <ArtStyleGrid styles={styles} />
      <div className="mt-8 text-center">
        <Link href="/book" className="btn-primary">Request a custom design</Link>
      </div>
    </div>
  );
}

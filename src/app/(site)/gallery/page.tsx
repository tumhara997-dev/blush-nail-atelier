import type { Metadata } from "next";
import Link from "next/link";
import { getArtStyles, getGallery } from "@/server/gallery";
import { GalleryGrid } from "@/components/gallery-grid";
import { SectionHead } from "@/components/section-head";

export const metadata: Metadata = { title: "Nail Gallery", description: "Real nail extensions and nail art by Blush." };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ style?: string }> }) {
  const { style } = await searchParams;
  const styles = await getArtStyles();
  const active = styles.find((s) => s.slug === style);
  const items = await getGallery({ styleId: active?.id });

  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold ${on ? "border-pink bg-pink text-white" : "border-line bg-white text-rose hover:border-pink"}`}>
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHead as="h1" eyebrow="Real work by Blush" title={active ? active.name : "Our Nail Gallery"} />
      <nav aria-label="Filter by style" className="mb-6 flex flex-wrap justify-center gap-2">
        {chip("/gallery", "All", !active)}
        {styles.map((s) => chip(`/gallery?style=${s.slug}`, s.name, active?.id === s.id))}
      </nav>
      <GalleryGrid items={items} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getArtStyles, getGallery } from "@/server/gallery";
import { getCatalog } from "@/server/catalog";
import { GalleryGrid } from "@/components/gallery-grid";
import { SectionHead } from "@/components/section-head";

export const metadata: Metadata = { title: "Gallery", description: "Real nail extensions, bridal sets and nail art from the BLUSH studio." };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ style?: string }> }) {
  const { style } = await searchParams;
  const [styles, catalog] = await Promise.all([getArtStyles(), getCatalog()]);
  const active = styles.find((s) => s.slug === style);
  const items = await getGallery({ styleId: active?.id });
  const custom = catalog.flatMap((c) => c.services).find((s) => s.slug === "custom-nail-art");

  const chip = (href: string, label: string, on: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={on ? "page" : undefined}
      className={`whitespace-nowrap rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition ${on ? "border-plum bg-plum text-cream" : "border-line bg-white/70 text-plum hover:border-plum/40"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
      <SectionHead as="h1" eyebrow="Real work, real clients" title={active ? active.name : "The gallery"}>
        Every photo is from our studio. Tap “Book this look” and we&apos;ll use it as your reference.
      </SectionHead>
      <nav aria-label="Filter by style" className="-mx-5 mb-10 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        {chip("/gallery", "All", !active)}
        {styles.map((s) => chip(`/gallery?style=${s.slug}`, s.name, active?.id === s.id))}
      </nav>
      <GalleryGrid items={items} customServiceId={custom?.id} />
    </div>
  );
}

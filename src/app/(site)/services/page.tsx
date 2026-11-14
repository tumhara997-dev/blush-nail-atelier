import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/server/catalog";
import { MenuList } from "@/components/menu-list";
import { GoldRule, SectionTitle } from "@/components/ornaments";

export const metadata: Metadata = { title: "Menu & Prices", description: "Acrylic, gel and soft gel extensions, gel polish, nail art, refills and removal — prices and timings." };

export default async function ServicesPage() {
  const catalog = await getCatalog();
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <SectionTitle as="h1" eyebrow="The menu" title={<>Services & <em className="font-normal text-rose">prices</em></>}>
        Extensions and art are priced by length, design and products — we always confirm your final price before we begin. Custom and bridal designs get a personal quote.
      </SectionTitle>
      <MenuList categories={catalog} />
      <GoldRule className="mt-20" />
      <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
        <Link href="/book" className="btn-primary">Book an appointment</Link>
        <Link href="/bridal" className="link-underline">Bridal & festive</Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { getCatalog } from "@/server/catalog";
import { getArtStyles, getGallery } from "@/server/gallery";
import { getSettings } from "@/server/settings";
import { ServiceCard } from "@/components/service-card";
import { GalleryGrid } from "@/components/gallery-grid";
import { SectionHead } from "@/components/section-head";
import { ArtStyleGrid } from "@/components/art-style-grid";

export default async function HomePage() {
  const [catalog, styles, featured, { salon }] = await Promise.all([getCatalog(), getArtStyles(), getGallery({ featuredOnly: true }), getSettings("salon")]);
  const services = catalog.flatMap((c) => c.services).slice(0, 4);
  const hero = featured[0];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NailSalon",
    name: salon.name,
    url: site,
    ...(salon.phone && { telephone: salon.phone }),
    ...(salon.address && { address: salon.address }),
    ...(salon.instagram && { sameAs: [salon.instagram] }),
    priceRange: "₹₹",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 sm:px-6 md:grid-cols-[1.05fr_.95fr] md:pt-12">
        <div>
          <div className="eyebrow">{salon.tagline}</div>
          <h1 className="h-display my-4 text-[44px] leading-[1.02] sm:text-6xl lg:text-[72px]">
            Little details.
            <br />
            <em className="font-normal text-pink">Beautiful nails.</em>
          </h1>
          <p className="max-w-md leading-8 text-muted">
            From elegant extensions to statement nail art, find a look that feels like you. See live availability and book your appointment in under a minute.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/book" className="btn-primary">Book an appointment</Link>
            <Link href="/services" className="btn-outline">View services & prices</Link>
          </div>
        </div>
        <div className="relative min-h-[320px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#f8dce7] to-[#dca4ba] md:min-h-[460px]">
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/media/${hero.mediaId}`} alt={hero.caption} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
          )}
          <span className="absolute bottom-4 left-4 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold tracking-[2px] text-rose">YOUR NAILS, YOUR STYLE</span>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionHead eyebrow="Our menu" title="Nail Services">Pick a service, choose a free slot and you're booked. Custom designs get a personal quote.</SectionHead>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {services.map((s) => (
            <ServiceCard key={s.id} s={s} />
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted">
          Also available: gel polish • refills • nail repair • reshaping • removal.{" "}
          <Link href="/services" className="font-bold text-rose underline-offset-2 hover:underline">See the full menu →</Link>
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionHead eyebrow="Make it yours" title="Explore Nail Art">From minimal classics to detailed custom designs.</SectionHead>
        <ArtStyleGrid styles={styles} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionHead eyebrow="Real work by Blush" title="Our Nail Gallery" />
        <GalleryGrid items={featured} />
        <div className="mt-6 text-center">
          <Link href="/gallery" className="btn-outline">See all photos</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionHead eyebrow="Simple & quick" title="How booking works" />
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["Choose your service", "Pick a service and options. Fixed-price services show the price upfront."],
            ["Pick a real free slot", "You only see times that are actually available, based on how long your service takes."],
            ["Get WhatsApp confirmation", "Log in with a one-time code — no password. We confirm instantly, or send a quote for custom designs."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-pale font-serif text-lg text-rose">{i + 1}</div>
              <h3 className="mt-3 font-serif text-lg text-plum">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl bg-plum px-6 py-10 text-center text-[#fff7fa]">
          <h2 className="font-serif text-3xl sm:text-[34px]">Ready for your next nail look?</h2>
          <p className="mt-2 text-sm text-[#f2dce5]">Have a design in mind? Book a slot and attach your inspiration — we&apos;ll plan it together.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/book" className="btn bg-white text-rose hover:bg-pale">Book now</Link>
            {salon.googleReviewsUrl && (
              <a href={salon.googleReviewsUrl} target="_blank" rel="noopener" className="btn border border-white/40 text-white hover:bg-white/10">
                Read our Google reviews
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

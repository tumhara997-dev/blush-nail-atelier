import Link from "next/link";
import { getCatalog } from "@/server/catalog";
import { getArtStyles, getGallery } from "@/server/gallery";
import { getSettings } from "@/server/settings";
import { findNextFreeSlot } from "@/server/availability";
import { Bow, GoldRule, SectionTitle } from "@/components/ornaments";
import { MenuList } from "@/components/menu-list";
import { GalleryGrid } from "@/components/gallery-grid";
import { formatHm } from "@/lib/time";

type Photo = { id: string; caption: string; mediaId: string };

function pick(items: Photo[], caption: string, fallback: number): Photo | undefined {
  return items.find((g) => g.caption.toLowerCase().includes(caption)) ?? items[fallback] ?? items[0];
}

function Img({ p, className, priority }: { p?: Photo; className: string; priority?: boolean }) {
  if (!p) return <div className={`bg-petal ${className}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/media/${p.mediaId}`} alt={p.caption} className={`object-cover ${className}`} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} />;
}

export default async function HomePage() {
  const [catalog, styles, gallery, { salon }] = await Promise.all([getCatalog(), getArtStyles(), getGallery(), getSettings("salon")]);
  const services = catalog.flatMap((c) => c.services);
  const quickest = services.filter((s) => s.bookingMode === "INSTANT" && !s.variants.length).sort((a, b) => a.durationMin - b.durationMin)[0];
  const next = quickest ? await findNextFreeSlot(quickest) : null;
  const nextLabel = next ? `${next.dayOffset === 0 ? "Today" : next.dayOffset === 1 ? "Tomorrow" : new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" }).format(next.startsAt)}, ${formatHm(next.time)}` : null;

  const hero = pick(gallery, "white bow", 3);
  const heroSmall = pick(gallery, "blossoms", 2);
  const bridal = pick(gallery, "burgundy", 0);
  const bridal2 = pick(gallery, "crystals", 4);
  const featured = gallery.filter((g) => g.isFeatured).slice(0, 8);
  const custom = services.find((s) => s.slug === "custom-nail-art");
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

  const words = ["French", "Chrome", "Cat eye", "Bridal", "Ombré", "Soft gel", "Foil & glitter", "Gel extensions", "3D art", "Spider gel"];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-pale" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="animate-rise">
            <div className="eyebrow flex items-center gap-3">
              <span className="h-px w-8 bg-gold" aria-hidden />
              Extensions · Gel · Nail art
            </div>
            <h1 className="h-display mt-6 text-[56px] leading-[0.95] sm:text-[78px] lg:text-[92px]">
              Little details,
              <br />
              <em className="font-normal text-rose">beautifully</em> done.
            </h1>
            <p className="mt-7 max-w-md text-[16px] leading-8 text-muted">
              An appointment-only nail studio for considered sets — from clean French tips to full bridal art. Choose your look, pick a real free slot, and we&apos;ll take it from there.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-6">
              <Link href="/book" className="btn-primary">Book an appointment</Link>
              <Link href="/services" className="link-underline">View the menu</Link>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              {[["Appointment", "only"], ["Real-time", "booking"], ["Bridal", "& festive"]].map(([a, b]) => (
                <div key={a}>
                  <dt className="font-serif text-[18px] leading-none text-plum sm:text-[22px]">{a}</dt>
                  <dd className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">{b}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] animate-rise [animation-delay:120ms]">
            <Img p={hero} priority className="arch aspect-[4/5] w-full shadow-[0_40px_80px_-40px_#4a162866]" />
            <div className="absolute -left-6 bottom-16 hidden h-36 w-36 overflow-hidden rounded-full border-[6px] border-cream shadow-lg sm:block">
              <Img p={heroSmall} className="h-full w-full" />
            </div>
            <Bow className="absolute -top-2 right-8 h-9 w-14 text-gold" />
            {nextLabel && (
              <Link
                href={quickest ? `/book?service=${quickest.id}` : "/book"}
                className="absolute -bottom-6 right-4 flex items-center gap-4 rounded-2xl border border-line bg-white/95 px-5 py-4 shadow-[0_20px_50px_-24px_#4a162860] backdrop-blur transition hover:-translate-y-0.5 sm:right-[-12px]"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-muted">Next free appointment</span>
                  <span className="font-serif text-xl text-plum">{nextLabel}</span>
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Marquee ──────────────────────────────────────────── */}
      <div className="overflow-hidden border-y border-line bg-white/60 py-5" aria-hidden>
        <div className="animate-marquee flex w-max gap-10 whitespace-nowrap font-serif text-[28px] italic text-plum/80">
          {[...words, ...words].map((w, i) => (
            <span key={i} className="flex items-center gap-10">
              {w}
              <span className="h-1.5 w-1.5 rotate-45 bg-gold/70" />
            </span>
          ))}
        </div>
      </div>

      {/* ── Menu ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <SectionTitle eyebrow="The menu" title={<>Services & <em className="font-normal text-rose">prices</em></>}>
          Final pricing depends on length, design and products — we always confirm before we begin.
        </SectionTitle>
        <MenuList categories={catalog} />
        <div className="mt-12 text-center">
          <Link href="/book" className="btn-primary">Reserve your seat</Link>
        </div>
      </section>

      {/* ── Bridal & festive edit ─────────────────────────────── */}
      <section className="bg-plum text-[#f3e6e1]">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2">
          <div className="relative order-2 mx-auto grid w-full max-w-[520px] grid-cols-[1.3fr_1fr] items-end gap-4 lg:order-1">
            <Img p={bridal} className="arch aspect-[3/4] w-full" />
            <Img p={bridal2} className="mb-10 aspect-[3/4] w-full rounded-[24px]" />
          </div>
          <div className="order-1 lg:order-2">
            <div className="text-[11px] uppercase tracking-[0.28em] text-gold">The bridal & festive edit</div>
            <h2 className="mt-4 font-serif text-[46px] font-medium leading-[1.02] text-[#fbf1ec] sm:text-[60px]">
              For the days you&apos;ll <em className="font-normal text-[#e9b9c1]">look back on.</em>
            </h2>
            <p className="mt-6 max-w-lg leading-8 text-[#d9c3bd]">
              Shaadi, sangeet, Diwali, Karva Chauth — sets designed around your outfit, mehendi and jewellery, with time set aside for a trial.
            </p>
            <ul className="mt-8 space-y-4 border-t border-white/10 pt-8">
              {["Consultation & design trial before the big day", "Bride + bridesmaids group bookings", "Outfit, mehendi and jewellery-matched designs", "Festive collections for Diwali & Karva Chauth"].map((t) => (
                <li key={t} className="flex items-start gap-4">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link href="/bridal" className="btn bg-[#f6e8e5] text-plum hover:bg-white">Explore bridal</Link>
              {custom && <Link href={`/book?service=${custom.id}&note=${encodeURIComponent("Bridal / festive consultation: ")}`} className="text-[12px] uppercase tracking-[0.16em] text-[#f3e6e1] underline decoration-gold underline-offset-[6px] hover:text-white">Request a consultation</Link>}
            </div>
          </div>
        </div>
      </section>

      {/* ── Gallery ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <SectionTitle eyebrow="Real work, real clients" title={<>From the <em className="font-normal text-rose">studio</em></>}>
          Every photo is our own work. Love one? Tap “Book this look” and we&apos;ll use it as your reference.
        </SectionTitle>
        <GalleryGrid items={featured} customServiceId={custom?.id} />
        <div className="mt-12 text-center">
          <Link href="/gallery" className="link-underline">See the full gallery</Link>
        </div>
      </section>

      {/* ── Nail art styles ──────────────────────────────────── */}
      <section className="border-t border-line bg-white/50 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <SectionTitle eyebrow="Make it yours" title={<>Find your <em className="font-normal text-rose">style</em></>} />
          <div className="-mx-5 flex snap-x gap-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:justify-center sm:px-8">
            {styles.filter((s) => s.coverMediaId).map((s) => (
              <Link key={s.id} href={`/gallery?style=${s.slug}`} className="group w-[180px] shrink-0 snap-start text-center sm:w-[210px]">
                <div className="arch aspect-[3/4] overflow-hidden bg-pale">
                  {s.coverMediaId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${s.coverMediaId}`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-b from-pale to-petal">
                      <Bow className="h-8 w-12 text-rose/50" />
                    </div>
                  )}
                </div>
                <div className="mt-4 font-serif text-xl text-plum group-hover:text-rose">{s.name}</div>
              </Link>
            ))}
          </div>
          {styles.some((s) => !s.coverMediaId) && (
            <p className="mx-auto mt-10 max-w-3xl text-center font-serif text-[22px] italic leading-relaxed text-muted">
              Also: {styles.filter((s) => !s.coverMediaId).map((s) => s.name).join(" · ")}
            </p>
          )}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <SectionTitle eyebrow="Simple, from start to finish" title={<>How booking <em className="font-normal text-rose">works</em></>} />
        <ol className="grid gap-12 md:grid-cols-3 md:gap-8">
          {[
            ["Choose your set", "Pick a service and length. Fixed prices are shown upfront; custom designs get a personal quote."],
            ["Pick a real slot", "You only see times that are genuinely free — calculated from how long your set takes."],
            ["Confirmed on WhatsApp", "Sign in with a one-time code. Your confirmation and a reminder the day before arrive on WhatsApp."],
          ].map(([t, d], i) => (
            <li key={t} className="text-center md:text-left">
              <div className="font-serif text-[64px] italic leading-none text-petal">0{i + 1}</div>
              <h3 className="mt-3 font-serif text-[26px] text-plum">{t}</h3>
              <p className="mt-2 leading-7 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Studio note ──────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 pb-8 text-center sm:px-8">
        <GoldRule />
        <blockquote className="mt-10 font-serif text-[30px] italic leading-[1.35] text-plum sm:text-[38px]">
          “We keep our days unhurried — one client at a time, clean tools, honest prices, and no rushing the details.”
        </blockquote>
        <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-muted">The {salon.name} studio</p>
      </section>
    </>
  );
}

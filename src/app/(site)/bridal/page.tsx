import { mediaUrl } from "@/lib/media-url";
import type { Metadata } from "next";
import Link from "next/link";
import { getGallery } from "@/server/gallery";
import { getCatalog } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { whatsappLink } from "@/lib/phone";
import { Bow, GoldRule, SectionTitle } from "@/components/ornaments";

export const metadata: Metadata = {
  title: "Bridal & Festive Nails",
  description: "Bridal, sangeet, Diwali and Karva Chauth nail sets designed around your outfit, mehendi and jewellery — with a design trial before the big day.",
};

const FAQ: [string, string][] = [
  ["How early should I book?", "For wedding dates in peak season (November–February), 3–6 weeks ahead is ideal so we can fit a consultation and a trial. Festive dates around Diwali fill quickly too."],
  ["Do you do a trial?", "Yes. We recommend a design trial 1–3 weeks before the wedding so the shape, length and art are exactly right — and so your natural nails are prepped."],
  ["Can you match my outfit and mehendi?", "Bring photos of your outfit, jewellery and mehendi design (or attach them when you book). We'll build the colour palette and art around them."],
  ["Can my bridesmaids book together?", "Yes — send a request for the group and we'll arrange back-to-back or parallel seats depending on the number of people."],
  ["How is the price decided?", "Bridal sets are priced on consultation because length, art and add-ons vary a lot. You'll get a clear quote on WhatsApp before anything is confirmed."],
];

export default async function BridalPage() {
  const [gallery, catalog, { salon }] = await Promise.all([getGallery(), getCatalog(), getSettings("salon")]);
  const custom = catalog.flatMap((c) => c.services).find((s) => s.slug === "custom-nail-art");
  const consultHref = custom ? `/book?service=${custom.id}&note=${encodeURIComponent("Bridal / festive consultation — event date: ")}` : "/book";
  const photos = ["burgundy", "crystals", "blossoms", "butter-yellow"].map((c, i) => gallery.find((g) => g.caption.toLowerCase().includes(c)) ?? gallery[i]).filter(Boolean);

  return (
    <>
      <section className="bg-plum text-[#f3e6e1]">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:py-28">
          <div>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-gold">
              <Bow className="h-4 w-7" /> Bridal & festive
            </div>
            <h1 className="mt-6 font-serif text-[52px] font-medium leading-[0.98] text-[#fbf1ec] sm:text-[76px]">
              Your nails,
              <br />
              <em className="font-normal text-[#e9b9c1]">your moment.</em>
            </h1>
            <p className="mt-7 max-w-md leading-8 text-[#d9c3bd]">
              Sets designed for shaadi, sangeet, haldi, Diwali and Karva Chauth — planned around your outfit and mehendi, with a trial so the big day holds no surprises.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link href={consultHref} className="btn bg-[#f6e8e5] text-plum hover:bg-white">Request a consultation</Link>
              {salon.whatsapp && (
                <a href={whatsappLink(salon.whatsapp, "Hi! I'd like to ask about bridal nails for my wedding on …")} target="_blank" rel="noopener" className="text-[12px] uppercase tracking-[0.16em] underline decoration-gold underline-offset-[6px] hover:text-white">
                  Ask on WhatsApp
                </a>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 items-end gap-4">
            {photos.slice(0, 2).map((p, i) =>
              p ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={mediaUrl(p.mediaId)} alt={p.caption} className={`w-full object-cover ${i === 0 ? "arch aspect-[3/4.4]" : "mb-14 aspect-[3/4] rounded-[24px]"}`} />
              ) : null,
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <SectionTitle eyebrow="What's included" title={<>Made around <em className="font-normal text-rose">you</em></>} />
        <div className="grid gap-12 md:grid-cols-3">
          {[
            ["The bride", "Extensions or natural-nail sets with custom art — French, foil, stones, 3D details or hand-painted motifs matched to your lehenga."],
            ["The bridal party", "Coordinated sets for sisters, bridesmaids and the mothers — booked together so everyone is ready on time."],
            ["Festive edits", "Seasonal designs for Diwali, Karva Chauth and New Year — think gold foil, deep reds, chrome and glitter."],
          ].map(([t, d]) => (
            <div key={t} className="border-t border-gold/40 pt-6">
              <h3 className="font-serif text-[28px] text-plum">{t}</h3>
              <p className="mt-3 leading-7 text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white/60 py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <SectionTitle eyebrow="The journey" title={<>From idea to <em className="font-normal text-rose">“I do”</em></>} />
          <ol className="grid gap-10 md:grid-cols-3">
            {[
              ["Consultation", "Share your date, outfit, mehendi and inspiration photos. We'll suggest shapes, lengths and designs and send a clear quote."],
              ["Design trial", "1–3 weeks before the event we create a trial so you can see and feel the set — and we fine-tune anything you'd change."],
              ["The day", "Your appointment is held exclusively for you, timed around your other bookings so nothing is rushed."],
            ].map(([t, d], i) => (
              <li key={t}>
                <div className="font-serif text-[64px] italic leading-none text-petal">0{i + 1}</div>
                <h3 className="mt-3 font-serif text-[26px] text-plum">{t}</h3>
                <p className="mt-2 leading-7 text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {photos.length > 2 && (
        <section className="mx-auto grid max-w-7xl gap-5 px-5 py-24 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {photos.map((p, i) =>
            p ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={mediaUrl(p.mediaId)} alt={p.caption} loading="lazy" className={`aspect-[3/4] w-full object-cover ${i % 2 ? "rounded-[24px] lg:mt-12" : "arch"}`} />
            ) : null,
          )}
        </section>
      )}

      <section className="mx-auto max-w-3xl px-5 pb-8 sm:px-8">
        <SectionTitle eyebrow="Good to know" title={<>Questions, <em className="font-normal text-rose">answered</em></>} />
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-[22px] text-plum [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-gold transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-3 leading-7 text-muted">{a}</p>
            </details>
          ))}
        </div>
        <GoldRule className="mt-16" />
        <div className="mt-10 text-center">
          <Link href={consultHref} className="btn-primary">Request a consultation</Link>
        </div>
      </section>
    </>
  );
}

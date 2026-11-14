import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSettings } from "@/server/settings";
import { whatsappLink } from "@/lib/phone";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { salon } = await getSettings("salon");
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <SiteHeader salonName={salon.name} />
      <main id="main">{children}</main>
      <SiteFooter salon={salon} />
      {salon.whatsapp && (
        <a
          href={whatsappLink(salon.whatsapp, `Hi ${salon.name}! I have a question about…`)}
          target="_blank"
          rel="noopener"
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-[#a94470] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_#77314f44] hover:bg-rose"
        >
          <span aria-hidden>💬</span> Chat on WhatsApp
        </a>
      )}
    </>
  );
}

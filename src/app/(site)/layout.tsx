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
      <SiteHeader salonName={salon.name} announcement={salon.announcement} />
      <main id="main">{children}</main>
      <SiteFooter salon={salon} />
      {salon.whatsapp && (
        <a
          href={whatsappLink(salon.whatsapp, `Hi ${salon.name}! I have a question about…`)}
          target="_blank"
          rel="noopener"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-cream/95 px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-plum shadow-[0_12px_30px_-10px_#4a162855] backdrop-blur hover:bg-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" />
          </svg>
          WhatsApp
        </a>
      )}
    </>
  );
}

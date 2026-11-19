import { siteUrl } from "@/lib/site-url";
import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

// Every page reads live data (settings, availability, sessions), so render on request.
// This also keeps `next build` from opening the database.
export const dynamic = "force-dynamic";

// Self-hosted at build time by next/font (no runtime requests to Google).
const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });
const body = Jost({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "BLUSH — Nail Atelier · Extensions, Gel & Nail Art", template: "%s · BLUSH" },
  description:
    "Acrylic, gel and soft gel extensions, gel polish, bridal and custom nail art. See our real work, check live availability and book your appointment at BLUSH.",
  openGraph: { type: "website", siteName: "BLUSH", locale: "en_IN" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#fcf8f4", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen font-sans font-light antialiased">{children}</body>
    </html>
  );
}

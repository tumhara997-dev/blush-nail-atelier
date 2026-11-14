import type { Metadata, Viewport } from "next";
import "./globals.css";

// Every page reads live data (settings, availability, sessions), so render on request.
// This also keeps `next build` from opening the database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "BLUSH — Nail Extensions, Gel & Nail Art", template: "%s · BLUSH" },
  description:
    "Acrylic, gel and soft gel extensions, gel polish and custom nail art. See real work, check live availability and book your appointment at BLUSH.",
  openGraph: { type: "website", siteName: "BLUSH", locale: "en_IN" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#c65b86", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}

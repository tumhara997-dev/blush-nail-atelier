import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return ["", "/services", "/bridal", "/nail-art", "/gallery", "/book", "/contact", "/policies/privacy", "/policies/cancellation"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === "/gallery" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.7,
  }));
}

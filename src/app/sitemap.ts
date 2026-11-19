import { siteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ["", "/services", "/bridal", "/nail-art", "/gallery", "/book", "/contact", "/policies/privacy", "/policies/cancellation"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === "/gallery" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.7,
  }));
}

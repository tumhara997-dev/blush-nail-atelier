/** Public site address: NEXT_PUBLIC_SITE_URL, else Netlify's automatic URL, else local dev. */
export const siteUrl = (): string => process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000";

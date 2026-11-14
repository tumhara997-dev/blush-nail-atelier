import { headers } from "next/headers";

// In-memory sliding window per IP + bucket. Fine for a single server; use Redis (Upstash) when scaling out.
const hits = new Map<string, number[]>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** Returns true when the caller has exceeded `limit` requests in `windowMs` for this bucket. */
export async function rateLimited(bucket: string, limit: number, windowMs: number): Promise<boolean> {
  const key = `${bucket}:${await clientIp()}`;
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) hits.clear(); // crude memory cap
  return list.length > limit;
}

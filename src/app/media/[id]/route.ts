import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser, isStaff } from "@/server/auth";
import { mediaBytes } from "@/server/media";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Serves stored photos. Gallery photos are public; inspiration photos only to their owner and staff. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const [m] = await db().select().from(schema.media).where(eq(schema.media.id, id)).limit(1);
  if (!m) return new Response("Not found", { status: 404 });

  const isPublic = m.kind === "GALLERY";
  if (!isPublic) {
    const user = await getCurrentUser();
    if (!user || (user.id !== m.ownerId && !isStaff(user))) return new Response("Not found", { status: 404 });
  }

  // Seed photos ship as public static files in /public — hand them to the CDN.
  // Relative Location: behind a CDN, req.url can carry an internal host, so never build an absolute URL from it.
  if (!m.data && m.path?.startsWith("/")) {
    return new Response(null, { status: 308, headers: { Location: m.path, "Cache-Control": isPublic ? "public, max-age=86400" : "private, max-age=3600" } });
  }

  const file = await mediaBytes(m);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": m.mime,
      // Media ids never change content, so public photos can be cached forever by browsers and the CDN.
      "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

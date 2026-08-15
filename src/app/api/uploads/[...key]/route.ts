import type { NextRequest } from "next/server";
import { readUploadStream, isSafeKey } from "@/lib/storage";

// Serves locally-stored uploads (product photos, brand logo) directly from
// PERSISTENT_UPLOADS_DIR, as a real Next.js route handler rather than a
// static file under public/.
//
// Why a route handler and not public/*: on Hostinger, Passenger's front-end
// serves anything under public/ straight from disk, bypassing the Node app
// entirely — fast for normal page loads, but it means the running app
// itself never actually handles those requests. Next's built-in image
// optimizer (/_next/image, used by every <Image>) fetches *local* image
// URLs differently: it simulates the request in-process against the Node
// app's own request handler, never touching Passenger's static-file path.
// If the file only "exists" from Passenger's point of view, that internal
// fetch gets nothing recognizable back — confirmed in production, and it
// broke every local product image's optimized variant (not just new
// uploads), while the raw /uploads/<file> URL kept working fine.
//
// A route handler like this one has no static-file equivalent for
// Passenger to shortcut, so both a real external request AND the
// optimizer's internal one are guaranteed to hit this exact same code path.
//
// This is dynamic content served fresh on every request (never a build-time
// concern — see readUploadStream: it reads whatever is on disk *right now*).
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

type Ctx = { params: Promise<{ key: string[] }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { key: segments } = await ctx.params;
  const key = (segments ?? []).join("/");

  // isSafeKey requires a single flat "<name>.<ext>" segment with no
  // slashes — a multi-segment path (from ../ tricks or a nested key) can
  // never match, so this alone rules out escaping PERSISTENT_UPLOADS_DIR.
  // readUploadStream re-validates internally too (defense in depth).
  if (!isSafeKey(key)) {
    return new Response("Not found", { status: 404 });
  }

  const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    // Uploads are only ever saved with an allow-listed image extension —
    // this shouldn't happen, but never serve a file under a guessed type.
    return new Response("Not found", { status: 404 });
  }

  const file = await readUploadStream(key);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(file.stream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(file.size),
      // Keys are random and never reused (a re-upload always gets a fresh
      // key) — safe to cache indefinitely once served.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

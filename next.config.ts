import type { NextConfig } from "next";

// If STORAGE_DRIVER=s3 is set, product/logo images are served from an
// external bucket (S3_PUBLIC_BASE_URL) rather than our own /uploads
// directory. next/image requires every remote host it optimizes to be
// explicitly allow-listed (a deliberate SSRF/abuse guard), so we read that
// one host out of the env at build/start time instead of hand-editing this
// file per deployment.
function s3RemotePattern() {
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (!base) return [];
  try {
    const { protocol, hostname } = new URL(base);
    return [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // Don't advertise the framework in responses.
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: s3RemotePattern(),
  },

  // On hosts where public/uploads is a symlink to a location outside the
  // project directory (see scripts/link-persistent-uploads.js — needed so
  // uploaded files survive across deploys on platforms that build into a
  // fresh directory every time), Next's build-time file tracer refuses to
  // follow it ("Symlink ... points out of the filesystem root") and the
  // build fails. Uploaded files are runtime content served directly by the
  // Node process, not a build dependency of any route, so there's nothing
  // useful for the tracer to include from that directory in the first
  // place — excluding it for every route is the correct fix, not a
  // workaround.
  outputFileTracingExcludes: {
    "/*": ["public/uploads/**/*"],
  },

  async headers() {
    return [
      {
        // Applies to every route — static hardening that costs nothing and
        // has no effect on functionality (no CSP here since the storefront
        // legitimately loads its own images/fonts only; nonce-based CSP is
        // a bigger lift that's not worth it for a same-origin-only app).
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

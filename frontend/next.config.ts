import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Same origin-derivation as resolveMediaUrl() in lib/api/client.ts — disk-
// stored uploads are served from the backend's own origin under /uploads,
// so next/image needs that origin allow-listed too (works in any
// environment since it reads the same NEXT_PUBLIC_API_URL). Falls back to
// the local dev default on a missing/malformed value instead of crashing
// config load entirely.
function resolveApiOrigin(): URL {
  try {
    return new URL((process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, ""));
  } catch {
    return new URL("http://localhost:4000");
  }
}

const apiOrigin = resolveApiOrigin();

// Next's built-in image optimizer hard-refuses to fetch from loopback/
// private IPs as an SSRF guard — no config short of this disables it, and
// the disk-storage backend hits it in local dev since it's served from
// localhost. Skip optimization only in that case; a real deployment's
// backend domain resolves publicly and still gets full optimization, same
// as Cloudinary always does.
const isLocalApiOrigin = ["localhost", "127.0.0.1", "::1"].includes(apiOrigin.hostname);

const nextConfig: NextConfig = {
  // Traces only the deps each route actually needs into .next/standalone —
  // Docker's frontend runtime image ships that folder instead of the full
  // node_modules tree (see frontend/Dockerfile).
  output: "standalone",
  // Clickjacking protection: without these, any external site could embed
  // login/checkout/admin pages in a hidden <iframe> and hijack clicks from
  // an already-authenticated visitor. X-Frame-Options is the legacy header,
  // frame-ancestors is its CSP-based replacement — set both for broad
  // browser support. The backend's helmet() only covers API JSON responses,
  // not these Next-rendered HTML pages, so this has to be set here too.
  // The full Content-Security-Policy (script-src, img-src, connect-src,
  // frame-ancestors, etc.) is NOT set here — it needs a fresh nonce per
  // request, which a static next.config.ts header can't produce, so it
  // lives in proxy.ts instead. X-Frame-Options/Referrer-Policy stay here
  // since they're request-invariant, and this way they still apply outside
  // proxy.ts's matcher too (static assets, files) even though a CSP there
  // wouldn't mean much.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Mirrors the Caddyfile (production) so dev behaves the same.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
  images: {
    unoptimized: isLocalApiOrigin,
    remotePatterns: [
      {
        protocol: apiOrigin.protocol.replace(":", "") as "http" | "https",
        hostname: apiOrigin.hostname,
        port: apiOrigin.port,
        pathname: "/uploads/**",
      },
      // Cloud-storage mode (see backend USE_CLOUD_STORAGE setting).
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

// Sentry build integration. Always applied, for its tree-shaking: the
// tracing and debug-logging code this app never uses (errors-only setup —
// see instrumentation-client.ts) is stripped from the client bundle.
// Source maps are uploaded only when the build has an auth token
// (SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT — build-time only, see
// frontend/Dockerfile), so stack traces show the original code; they're
// deleted from the build output afterwards, never served publicly.
const sentryUploadEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  bundleSizeOptimizations: { excludeTracing: true, excludeDebugStatements: true },
  webpack: { treeshake: { removeTracing: true, removeDebugLogging: true } },
  sourcemaps: sentryUploadEnabled ? { deleteSourcemapsAfterUpload: true } : { disable: true },
});

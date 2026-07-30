import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

export default withNextIntl(nextConfig);

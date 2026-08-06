import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Admin panel and auth/account flows aren't public content — matches
      // the per-page `robots: { index: false }` metadata as defense in depth.
      disallow: [
        "/admin",
        "/*/login",
        "/*/register",
        "/*/forgot-password",
        "/*/reset-password",
        "/*/account",
        "/*/wishlist",
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}

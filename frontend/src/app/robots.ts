import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Only /admin belongs here — it's not a page we want crawled AT ALL
      // (no crawl budget wasted on internal tooling). The auth/account/cart/
      // checkout pages used to be listed here too, alongside their own
      // per-page `robots: { index: false }` metadata — that combination is
      // actually counterproductive: a robots.txt Disallow stops Googlebot
      // from ever FETCHING the page, so it never even sees the noindex tag.
      // If one of those URLs ever picks up an external backlink, Google can
      // still show a bare, snippet-less "no information is available"
      // listing for it instead of fully excluding it, which the meta
      // noindex would have done correctly if crawling were allowed. Those
      // pages' own `index: false` metadata is the one mechanism doing real
      // work here now.
      disallow: ["/admin"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}

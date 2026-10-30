import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// hreflang alternates: one absolute URL per locale for the same logical page,
// plus x-default pointing at the default-locale version — lets search engines
// treat /ka/helmets, /en/helmets, /ru/helmets as translations of one page
// instead of unrelated/duplicate content.
//
// `page` (> 1) is carried over so page N's alternates point at page N in
// each language — matching its self-referencing canonical; pointing them at
// page 1 broke the reciprocal hreflang links and Google ignored them.
export function getAlternateLanguages(pathname: string, options?: { page?: number }): Record<string, string> {
  const siteUrl = getSiteUrl();
  const query = options?.page && options.page > 1 ? `?page=${options.page}` : "";
  const languages: Record<string, string> = {};

  for (const locale of routing.locales) {
    languages[locale] = `${siteUrl}${getPathname({ href: pathname, locale })}${query}`;
  }
  languages["x-default"] = `${siteUrl}${getPathname({ href: pathname, locale: routing.defaultLocale })}${query}`;

  return languages;
}

// `?page=` of a public paginated list: a whole number > 1, anything else
// (missing, 1, 0, -3, 2.5, "abc") is page 1 — which then canonicalizes to
// the page-less URL. A page past the end is the caller's 404 to raise.
export function parsePageParam(page: string | undefined): number {
  const parsed = Number(page);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : 1;
}

// JSON.stringify never escapes "<", so a name/description containing a
// literal "</script>" would otherwise close the tag early and let the rest
// be parsed as HTML — escaping "<" to its unicode escape neutralizes that
// while staying valid, semantically identical JSON.
export function jsonLdScriptProps(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

// Deliberately never includes a `sort` param — sort only reorders the same
// item set, so it always canonicalizes back to the unsorted version (per
// Google's faceted-navigation guidance). `page` is included when > 1 since
// each page is genuinely different content and must self-canonicalize.
export function buildCanonicalUrl(
  pathname: string,
  locale: string,
  options?: { page?: number },
): string {
  const siteUrl = getSiteUrl();
  const localizedPath = getPathname({ href: pathname, locale });
  const page = options?.page;
  const query = page && page > 1 ? `?page=${page}` : "";
  return `${siteUrl}${localizedPath}${query}`;
}

// Metadata for a page that must not be indexed. Also resets `alternates`:
// [locale]/layout.tsx sets the home page as the site-wide canonical/hreflang
// default, and a page that only set `robots` inherited it — telling crawlers
// "don't index this" and "this is a duplicate of the home page" at once. A
// noindex page needs no canonical at all. (Next merges metadata shallowly,
// so an empty `alternates` replaces the inherited one entirely.)
//
// follow: true where the page lists real catalog links worth crawling
// (search, shop listings); false for private/utility pages.
export function noindexMetadata({ follow }: { follow: boolean }): Pick<Metadata, "robots" | "alternates"> {
  return { robots: { index: false, follow }, alternates: {} };
}

import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// hreflang alternates: one absolute URL per locale for the same logical page,
// plus x-default pointing at the default-locale version — lets search engines
// treat /ka/helmets, /en/helmets, /ru/helmets as translations of one page
// instead of unrelated/duplicate content.
export function getAlternateLanguages(pathname: string): Record<string, string> {
  const siteUrl = getSiteUrl();
  const languages: Record<string, string> = {};

  for (const locale of routing.locales) {
    languages[locale] = `${siteUrl}${getPathname({ href: pathname, locale })}`;
  }
  languages["x-default"] = `${siteUrl}${getPathname({ href: pathname, locale: routing.defaultLocale })}`;

  return languages;
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

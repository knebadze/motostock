import type { MetadataRoute } from "next";
import { getCategoriesFromServer } from "@/lib/api/server";
import { getAlternateLanguages } from "@/lib/seo";
import { routing } from "@/i18n/routing";

// Admin/auth/account pages are deliberately excluded — they're not public
// content (see robots.ts, which also disallows them from crawling).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categories = await getCategoriesFromServer();
  const entries: MetadataRoute.Sitemap = [];

  const homeLanguages = getAlternateLanguages("/");
  for (const locale of routing.locales) {
    entries.push({ url: homeLanguages[locale], alternates: { languages: homeLanguages } });
  }

  for (const category of categories) {
    const languages = getAlternateLanguages(`/${category.slug}`);
    for (const locale of routing.locales) {
      entries.push({ url: languages[locale], alternates: { languages } });
    }
  }

  return entries;
}

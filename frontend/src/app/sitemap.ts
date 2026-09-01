import type { MetadataRoute } from "next";
import {
  getCategoriesFromServer,
  getProductsFromServer,
  getVehicleListingsFromServer,
} from "@/lib/api/server";
import { getAlternateLanguages } from "@/lib/seo";
import { routing } from "@/i18n/routing";

// Admin/auth/account pages are deliberately excluded — they're not public
// content (see robots.ts, which also disallows them from crawling).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, vehicleListings] = await Promise.all([
    getCategoriesFromServer(),
    getProductsFromServer(),
    getVehicleListingsFromServer(),
  ]);
  const entries: MetadataRoute.Sitemap = [];

  const homeLanguages = getAlternateLanguages("/");
  for (const locale of routing.locales) {
    entries.push({ url: homeLanguages[locale], alternates: { languages: homeLanguages } });
  }

  // Static nav pages — no DB-backed updatedAt to source lastModified from
  // (unlike categories/products/listings below), so left unset, same as home.
  const staticPages = ["/catalog", "/about", "/faq", "/contact", "/terms"];
  for (const pathname of staticPages) {
    const languages = getAlternateLanguages(pathname);
    for (const locale of routing.locales) {
      entries.push({ url: languages[locale], alternates: { languages } });
    }
  }

  for (const category of categories) {
    const languages = getAlternateLanguages(`/${category.slug}`);
    for (const locale of routing.locales) {
      entries.push({
        url: languages[locale],
        alternates: { languages },
        lastModified: category.updatedAt,
      });
    }
  }

  for (const product of products) {
    const languages = getAlternateLanguages(`/${product.category.slug}/${product.slug}`);
    for (const locale of routing.locales) {
      entries.push({
        url: languages[locale],
        alternates: { languages },
        lastModified: product.updatedAt,
      });
    }
  }

  for (const listing of vehicleListings) {
    const languages = getAlternateLanguages(`/${listing.vehicleCatalog.category.slug}/${listing.id}`);
    for (const locale of routing.locales) {
      entries.push({
        url: languages[locale],
        alternates: { languages },
        lastModified: listing.updatedAt,
      });
    }
  }

  return entries;
}

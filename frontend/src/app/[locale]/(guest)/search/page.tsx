import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getCategoriesFromServer,
  getMyGarageFromServer,
  getShopCategoryFacetsFromServer,
  getShopProductsPageFromServer,
  searchVehicleListingsFromServer,
} from "@/lib/api/server";
import { SEARCH_MIN_LENGTH } from "@/lib/api/search";
import { ShopAllProductsPage } from "@/components/shop/ShopAllProductsPage";
import { VehicleListingsCarouselSection } from "@/components/home/VehicleListingsCarouselSection";

type Locale = "ka" | "en" | "ru";
const MAX_QUERY_LENGTH = 100;
const MATCHING_CATEGORIES_LIMIT = 10;

function normalizeQuery(q: string | undefined): string {
  return (q ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "Search" });
  const query = normalizeQuery(q);
  return {
    title: query ? t("metaTitle", { q: query }) : t("emptyTitle"),
    // Result pages for arbitrary queries shouldn't be indexed.
    robots: { index: false, follow: true },
  };
}

// The header search's "view all results" target (and its Enter key):
// matching categories, vehicle listings and products for one query. Products
// reuse the /shop page component (category/vehicle filters, sorting,
// pagination) seeded with the query; vehicles get a carousel.
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  const localeKey = locale as Locale;
  const t = await getTranslations({ locale, namespace: "Search" });
  const query = normalizeQuery(q);

  if (query.length < SEARCH_MIN_LENGTH) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight">{t("emptyTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          {query ? t("minChars", { count: SEARCH_MIN_LENGTH }) : t("emptyHint")}
        </p>
      </div>
    );
  }

  const [categoryFacets, productsPage, vehicleListings, garageVehicles, allCategories] = await Promise.all([
    getShopCategoryFacetsFromServer({ search: query }),
    getShopProductsPageFromServer({ search: query }),
    searchVehicleListingsFromServer(query),
    getMyGarageFromServer(),
    getCategoriesFromServer(),
  ]);

  const needle = query.toLocaleLowerCase(locale);
  const matchingCategories = allCategories
    .filter((category) => category.name[localeKey].toLocaleLowerCase(locale).includes(needle))
    .slice(0, MATCHING_CATEGORIES_LIMIT);
  const nothingFound = matchingCategories.length === 0 && vehicleListings.length === 0 && productsPage.total === 0;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("resultsTitle", { q: query })}</h1>
        {nothingFound && <p className="mt-2 text-muted-foreground">{t("noResults", { q: query })}</p>}

        {matchingCategories.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("categoriesHeading")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {matchingCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${category.slug}`}
                  className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary-text"
                >
                  {category.name[localeKey]}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {vehicleListings.length > 0 && (
        <VehicleListingsCarouselSection title={t("vehiclesHeading")} listings={vehicleListings} />
      )}

      {!nothingFound && (
        <ShopAllProductsPage
          // Remount per query so the seeded search/filters/pagination reset
          // when the header search navigates here with a new term.
          key={query}
          categories={categoryFacets}
          initialData={productsPage}
          garageVehicles={garageVehicles}
          initialOnSale={false}
          initialSearch={query}
          title={t("productsHeading")}
        />
      )}
    </>
  );
}

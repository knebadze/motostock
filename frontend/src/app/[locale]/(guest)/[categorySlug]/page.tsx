import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getCategoriesStrictFromServer,
  getCategorySlugRedirectFromServer,
  getCategoryFiltersFromServer,
  getCategoryItemCountsFromServer,
  getMyGarageFromServer,
  getProductBrandFacetsFromServer,
  getProductsPageFromServer,
  getVehicleBrandFacetsFromServer,
  getVehicleCategoryFiltersFromServer,
  getVehicleListingsPageFromServer,
} from "@/lib/api/server";
import {
  isVehicleCategory,
  getAncestorChain,
  getDescendantIds,
  getVehicleFitmentDisabledCategoryIds,
} from "@/lib/categories-tree";
import { buildCanonicalUrl, getAlternateLanguages, parsePageParam } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { JsonLd } from "@/components/shared/JsonLd";
import { ProductShopPage } from "@/components/shop/ProductShopPage";
import { VehicleShopPage } from "@/components/shop/VehicleShopPage";
import { buildSocialMetadata } from "@/lib/share-metadata";
import { permanentRedirect } from "@/i18n/navigation";

type Locale = "ka" | "en" | "ru";
type PageParams = { locale: Locale; categorySlug: string };
type PageSearchParams = { page?: string; sort?: string; eventId?: string };

type ProductSortBy = "newest" | "price-asc" | "price-desc";
const PRODUCT_SORT_VALUES: ProductSortBy[] = ["newest", "price-asc", "price-desc"];
function parseProductSortBy(value: string): ProductSortBy {
  return (PRODUCT_SORT_VALUES as string[]).includes(value) ? (value as ProductSortBy) : "newest";
}

type VehicleSortBy = "newest" | "year-desc" | "price-asc" | "price-desc";
const VEHICLE_SORT_VALUES: VehicleSortBy[] = ["newest", "year-desc", "price-asc", "price-desc"];
function parseVehicleSortBy(value: string): VehicleSortBy {
  return (VEHICLE_SORT_VALUES as string[]).includes(value) ? (value as VehicleSortBy) : "newest";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}): Promise<Metadata> {
  const { locale, categorySlug } = await params;
  const { page } = await searchParams;

  const categories = await getCategoriesStrictFromServer();
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) return {};

  const pageNum = parsePageParam(page);
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const title =
    pageNum > 1
      ? t("categoryTitleWithPage", {
          category: category.name[locale],
          page: pageNum,
          siteName: siteConfig.name,
        })
      : t("categoryTitle", { category: category.name[locale], siteName: siteConfig.name });
  const description = t("categoryDescription", {
    category: category.name[locale],
    siteName: siteConfig.name,
  });
  const pathname = `/${categorySlug}`;

  return {
    title,
    description,
    alternates: {
      canonical: buildCanonicalUrl(pathname, locale, { page: pageNum }),
      languages: getAlternateLanguages(pathname, { page: pageNum }),
    },
    ...(await buildSocialMetadata({
      locale,
      title,
      description,
      pathname,
      imageSrc: category.bannerImageUrl ?? category.imageUrl,
    })),
  };
}

export default async function CategoryShopPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const { locale, categorySlug } = await params;
  const { page, sort, eventId } = await searchParams;

  const categories = await getCategoriesStrictFromServer();
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) {
    // A renamed category's old URL — 301 to its current slug, keeping the
    // page/sort/event query.
    const moved = await getCategorySlugRedirectFromServer(categorySlug);
    if (moved) {
      const query = Object.fromEntries(
        Object.entries({ page, sort, eventId }).filter(([, value]) => value != null),
      ) as Record<string, string>;
      permanentRedirect({ href: { pathname: `/${moved.slug}`, query }, locale });
    }
    notFound();
  }

  const initialPage = parsePageParam(page);
  const initialSort = sort ?? "newest";
  // Set by the homepage hero-slider's event-scoped DISCOUNT slides (see
  // HeroSlider.tsx's buildDiscountLink) when a BulkDiscountEvent targets
  // vehicle listings — always visited via the vehicle root category
  // (VEHICLE_ROOT_CATEGORY_SLUG), never a leaf category, since
  // resolveCategoryAndDescendantIds already covers every vehicle category
  // from there. Vehicle-only: PRODUCT events link to the cross-category
  // /shop page instead.
  const parsedEventId = eventId ? Number(eventId) : undefined;

  const isVehicle = isVehicleCategory(categories, category.id);
  const vehicleSortBy = parseVehicleSortBy(initialSort);
  const productSortBy = parseProductSortBy(initialSort);
  // Vehicle-independent category (Category.vehicleFitmentEnabled off, e.g.
  // helmets): no "my vehicle" filter even if one is configured for it.
  const vehicleFitmentEnabled = !getVehicleFitmentDisabledCategoryIds(categories).has(category.id);

  // Everything this page needs once the category is known, fetched in one
  // go rather than translations → item counts → page data one after the
  // other. The vehicle branch: `brandFacets` (the distinct brands present —
  // a lean dedicated endpoint, not an unbounded full-listing fetch) feeds
  // the brand checkboxes, `listingsPage` (real server pagination) the grid.
  // The product branch: same, plus the configured filters and — the
  // garage/session vehicle is deliberately never used to pre-filter the
  // list; it only takes effect once picked from the MY_VEHICLE filter — the
  // shopper's garage for that filter.
  const [tNav, itemCounts, data] = await Promise.all([
    getTranslations({ locale, namespace: "Nav" }),
    getCategoryItemCountsFromServer(),
    isVehicle
      ? Promise.all([
          getVehicleBrandFacetsFromServer(category.id, parsedEventId),
          getVehicleListingsPageFromServer(category.id, initialPage, vehicleSortBy, parsedEventId),
          getVehicleCategoryFiltersFromServer(category.id),
        ]).then(([brandFacets, listingsPage, vehicleFilters]) => ({
          kind: "vehicle" as const,
          brandFacets,
          listingsPage,
          vehicleFilters,
        }))
      : Promise.all([
          getProductBrandFacetsFromServer(category.id),
          getProductsPageFromServer(category.id, initialPage, productSortBy),
          getCategoryFiltersFromServer(category.id),
          vehicleFitmentEnabled ? getMyGarageFromServer() : Promise.resolve([]),
        ]).then(([brandFacets, productsPage, configuredFilters, garageVehicles]) => ({
          kind: "product" as const,
          brandFacets,
          productsPage,
          configuredFilters,
          garageVehicles,
        })),
  ]);

  const ancestorChain = getAncestorChain(categories, category.id);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: tNav("home"),
        item: getAlternateLanguages("/")[locale],
      },
      ...ancestorChain.map((ancestor, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: ancestor.name[locale],
        item: getAlternateLanguages(`/${ancestor.slug}`)[locale],
      })),
    ],
  };

  // Rolled up over each subtree. Empty subcategories are left out of the
  // subcategory filter — unless the counts couldn't be loaded at all
  // (fallback {}), then every subcategory stays.
  const countsKnown = Object.keys(itemCounts).length > 0;
  const subcategories = categories.filter(
    (item) => item.parentId === category.id && (!countsKnown || (itemCounts[item.id] ?? 0) > 0),
  );
  const subcategoryCounts = countsKnown
    ? Object.fromEntries(subcategories.map((subcategory) => [subcategory.id, itemCounts[subcategory.id] ?? 0]))
    : undefined;
  // Subcategory filter checkboxes filter by each one's whole subtree.
  const subcategoryCategoryIds = Object.fromEntries(
    subcategories.map((subcategory) => [subcategory.id, [subcategory.id, ...getDescendantIds(categories, subcategory.id)]]),
  );

  const breadcrumbScript = <JsonLd data={breadcrumbJsonLd} />;

  if (data.kind === "vehicle") {
    const { brandFacets, listingsPage, vehicleFilters } = data;
    // A page past the end (?page=999) — 404, not an empty page that would
    // be indexed as its own self-canonical URL.
    if (initialPage > 1 && listingsPage.items.length === 0) notFound();
    return (
      <>
        {breadcrumbScript}
        <VehicleShopPage
          category={category}
          breadcrumbChain={ancestorChain}
          subcategories={subcategories}
          subcategoryCategoryIds={subcategoryCategoryIds}
          subcategoryCounts={subcategoryCounts}
          brands={brandFacets}
          initialData={listingsPage}
          filters={vehicleFilters}
          initialSort={vehicleSortBy}
          initialEventId={parsedEventId}
        />
      </>
    );
  }

  const { brandFacets, productsPage, configuredFilters, garageVehicles } = data;
  // Same past-the-end 404 as the vehicle branch above.
  if (initialPage > 1 && productsPage.items.length === 0) notFound();
  const filters = vehicleFitmentEnabled
    ? configuredFilters
    : configuredFilters.filter((filter) => filter.filterType !== "MY_VEHICLE");
  return (
    <>
      {breadcrumbScript}
      <ProductShopPage
        category={category}
        breadcrumbChain={ancestorChain}
        subcategories={subcategories}
        subcategoryCategoryIds={subcategoryCategoryIds}
        subcategoryCounts={subcategoryCounts}
        brands={brandFacets}
        initialData={productsPage}
        filters={filters}
        garageVehicles={garageVehicles}
        initialSort={productSortBy}
      />
    </>
  );
}

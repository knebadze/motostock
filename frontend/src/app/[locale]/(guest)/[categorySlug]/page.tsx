import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getCategoriesFromServer,
  getCategoryFiltersFromServer,
  getMyGarageFromServer,
  getProductsFromServer,
  getProductsPageFromServer,
  getVehicleCategoryFiltersFromServer,
  getVehicleListingsFromServer,
  getVehicleListingsPageFromServer,
} from "@/lib/api/server";
import { isVehicleCategory, getAncestorChain } from "@/lib/categories-tree";
import { buildCanonicalUrl, getAlternateLanguages, jsonLdScriptProps } from "@/lib/seo";
import { resolveMediaUrl } from "@/lib/api/client";
import { siteConfig } from "@/config/site";
import { ProductShopPage } from "@/components/shop/ProductShopPage";
import { VehicleShopPage } from "@/components/shop/VehicleShopPage";

type Locale = "ka" | "en" | "ru";
type PageParams = { locale: Locale; categorySlug: string };
type PageSearchParams = { page?: string; sort?: string };

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

  const categories = await getCategoriesFromServer();
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) return {};

  const pageNum = Number(page) || 1;
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
  const image = resolveMediaUrl(category.bannerImageUrl ?? category.imageUrl);

  return {
    title,
    description,
    alternates: {
      canonical: buildCanonicalUrl(pathname, locale, { page: pageNum }),
      languages: getAlternateLanguages(pathname),
    },
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
    },
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
  const { page, sort } = await searchParams;

  const categories = await getCategoriesFromServer();
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) {
    notFound();
  }

  const initialPage = Number(page) || 1;
  const initialSort = sort ?? "newest";

  const tNav = await getTranslations({ locale, namespace: "Nav" });
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

  const isVehicle = isVehicleCategory(categories, category.id);
  const subcategories = categories.filter((item) => item.parentId === category.id);

  const breadcrumbScript = (
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScriptProps(breadcrumbJsonLd)} />
  );

  if (isVehicle) {
    const vehicleSortBy = parseVehicleSortBy(initialSort);
    // `listings` (unbounded) feeds the brand-checkbox facet list, which needs
    // to see every brand present in the category, not just the current
    // page's — `listingsPage` (real server pagination) feeds the actual grid.
    const [listings, listingsPage, vehicleFilters] = await Promise.all([
      getVehicleListingsFromServer(category.id),
      getVehicleListingsPageFromServer(category.id, initialPage, vehicleSortBy),
      getVehicleCategoryFiltersFromServer(category.id),
    ]);
    return (
      <>
        {breadcrumbScript}
        <VehicleShopPage
          category={category}
          breadcrumbChain={ancestorChain}
          subcategories={subcategories}
          listings={listings}
          initialData={listingsPage}
          filters={vehicleFilters}
          initialSort={vehicleSortBy}
        />
      </>
    );
  }

  // The garage/session vehicle is deliberately never used to pre-filter this
  // list — it only takes effect once the shopper explicitly picks it from
  // the MY_VEHICLE filter on this page (see ProductFilters/ProductShopPage).
  // `products` (unbounded) feeds the brand-checkbox facet list, same
  // reasoning as `listings` above; `productsPage` feeds the actual grid.
  const productSortBy = parseProductSortBy(initialSort);
  const [products, productsPage, filters, garageVehicles] = await Promise.all([
    getProductsFromServer(category.id),
    getProductsPageFromServer(category.id, initialPage, productSortBy),
    getCategoryFiltersFromServer(category.id),
    getMyGarageFromServer(),
  ]);
  return (
    <>
      {breadcrumbScript}
      <ProductShopPage
        category={category}
        breadcrumbChain={ancestorChain}
        subcategories={subcategories}
        products={products}
        initialData={productsPage}
        filters={filters}
        garageVehicles={garageVehicles}
        initialSort={productSortBy}
      />
    </>
  );
}

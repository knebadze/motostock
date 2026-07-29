import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getCategoriesFromServer,
  getProductsFromServer,
  getVehicleListingsFromServer,
} from "@/lib/api/server";
import { getAncestorChain, getRootCategory } from "@/lib/categories-tree";
import { buildCanonicalUrl, getAlternateLanguages } from "@/lib/seo";
import { resolveMediaUrl } from "@/lib/api/client";
import { siteConfig } from "@/config/site";
import { ProductShopPage } from "@/components/shop/ProductShopPage";
import { VehicleShopPage } from "@/components/shop/VehicleShopPage";

const VEHICLE_ROOT_CATEGORY_SLUG = "transport";

type Locale = "ka" | "en" | "ru";
type PageParams = { locale: Locale; categorySlug: string };
type PageSearchParams = { page?: string; sort?: string };

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

  const root = getRootCategory(categories, category.id);
  const isVehicleCategory = root?.slug === VEHICLE_ROOT_CATEGORY_SLUG;

  const breadcrumbScript = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
    />
  );

  if (isVehicleCategory) {
    const listings = await getVehicleListingsFromServer(category.id);
    return (
      <>
        {breadcrumbScript}
        <VehicleShopPage
          category={category}
          breadcrumbChain={ancestorChain}
          listings={listings}
          initialPage={initialPage}
          initialSort={initialSort}
        />
      </>
    );
  }

  const products = await getProductsFromServer(category.id);
  return (
    <>
      {breadcrumbScript}
      <ProductShopPage
        category={category}
        breadcrumbChain={ancestorChain}
        products={products}
        initialPage={initialPage}
        initialSort={initialSort}
      />
    </>
  );
}

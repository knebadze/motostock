import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getCategoriesFromServer,
  getFrequentlyBoughtTogetherFromServer,
  getProductDetailFromServer,
  getSimilarProductsFromServer,
  getVehicleListingFromServer,
  getVehicleListingsFromServer,
  getViewedTogetherFromServer,
} from "@/lib/api/server";
import { buildVehicleListingSlug, parseVehicleListingIdFromSlug } from "@/lib/api/vehicle-listings";
import { getAncestorChain, isVehicleCategory } from "@/lib/categories-tree";
import { buildCanonicalUrl, getAlternateLanguages } from "@/lib/seo";
import { resolveMediaUrl } from "@/lib/api/client";
import { siteConfig } from "@/config/site";
import { SELECTED_VEHICLE_COOKIE } from "@/lib/vehicle-selection";
import { JsonLd } from "@/components/shared/JsonLd";
import { ProductDetailPage } from "@/components/shop/product-detail/ProductDetailPage";
import { VehicleListingDetailPage } from "@/components/shop/vehicle-listing-detail/VehicleListingDetailPage";

type Locale = "ka" | "en" | "ru";
type PageParams = { locale: Locale; categorySlug: string; itemSlug: string };

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function resolveIsVehicleCategory(categorySlug: string): Promise<boolean> {
  const categories = await getCategoriesFromServer();
  const category = categories.find((item) => item.slug === categorySlug);
  return category ? isVehicleCategory(categories, category.id) : false;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, categorySlug, itemSlug } = await params;

  if (await resolveIsVehicleCategory(categorySlug)) {
    const id = parseVehicleListingIdFromSlug(itemSlug);
    const listing = id != null ? await getVehicleListingFromServer(id) : null;
    if (!listing) return {};

    const title = [listing.vehicleCatalog.brand.name, listing.vehicleCatalog.model.name]
      .filter(Boolean)
      .join(" ");
    const fullTitle = `${title} — ${siteConfig.name}`;
    const rawDescription =
      locale === "en" ? listing.descriptionEn : locale === "ru" ? listing.descriptionRu : listing.descriptionKa;
    const description = rawDescription ? stripHtml(rawDescription).slice(0, 200) : fullTitle;
    // Always the canonical slugged form (see buildVehicleListingSlug), even
    // when this exact request came in on the older bare-id URL — that's what
    // makes the canonical tag below actually do its job of pointing crawlers
    // at the one preferred URL instead of leaving both live paths as
    // equally-valid duplicates.
    const pathname = `/${listing.vehicleCatalog.category.slug}/${buildVehicleListingSlug(listing)}`;
    const image = resolveMediaUrl(listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl);

    return {
      title: fullTitle,
      description,
      alternates: {
        canonical: buildCanonicalUrl(pathname, locale),
        languages: getAlternateLanguages(pathname),
      },
      // siteName/locale/type explicitly repeated (not just title/description/
      // images) — Next.js doesn't deep-merge a per-page openGraph into the
      // root layout's, it replaces the whole object, so without these a
      // shared social link for this page silently lost them.
      openGraph: {
        title: fullTitle,
        description,
        siteName: siteConfig.name,
        locale,
        type: "website",
        images: image ? [image] : undefined,
      },
      // No per-page twitter block existed before, so every product/vehicle
      // page shared on X/Twitter rendered the generic site-wide card (from
      // the root layout) with no real photo — summary_large_image matters
      // here specifically because these pages always have a real photo.
      twitter: {
        card: "summary_large_image",
        title: fullTitle,
        description,
        images: image ? [image] : undefined,
      },
    };
  }

  // Same vehicleCatalogId as the page body below, so both calls share one
  // cached request — see getProductDetailFromServer for why that matters
  // (the endpoint counts a view per call).
  const selectedVehicleCatalogId = (await cookies()).get(SELECTED_VEHICLE_COOKIE)?.value;
  const product = await getProductDetailFromServer(itemSlug, selectedVehicleCatalogId);
  if (!product) return {};

  // metaTitle is the FULL page title, not just the product name — the admin
  // form's auto-fill already bakes in "| siteConfig.name" within its 70-char
  // budget (ProductForm.tsx's handleNameChange), same as metaDescription
  // below is used as-is rather than wrapped in more text. Without this `??`,
  // an admin-authored meta title was silently discarded and this generic
  // fallback used instead, no matter what the SEO tab had saved.
  // Per-locale meta (each language's page gets its own), falling back to
  // that locale's name/description — never to another language's meta.
  const localizedMetaTitle =
    locale === "en" ? product.metaTitleEn : locale === "ru" ? product.metaTitleRu : product.metaTitleKa;
  const localizedMetaDescription =
    locale === "en"
      ? product.metaDescriptionEn
      : locale === "ru"
        ? product.metaDescriptionRu
        : product.metaDescriptionKa;
  const title = localizedMetaTitle ?? `${product.name[locale]} — ${siteConfig.name}`;
  const rawDescription =
    localizedMetaDescription ??
    (locale === "en" ? product.descriptionEn : locale === "ru" ? product.descriptionRu : product.descriptionKa);
  const description = rawDescription ? stripHtml(rawDescription).slice(0, 200) : title;
  const pathname = `/${product.category.slug}/${itemSlug}`;
  const image = resolveMediaUrl(product.variants[0]?.images[0]?.imageUrl ?? product.imageUrl);

  return {
    title,
    description,
    alternates: {
      canonical: buildCanonicalUrl(pathname, locale),
      languages: getAlternateLanguages(pathname),
    },
    // siteName/locale/type repeated here too — see the vehicle-listing
    // branch above's comment on why (Next.js replaces, not merges, a
    // per-page openGraph against the root layout's).
    openGraph: {
      title,
      description,
      siteName: siteConfig.name,
      locale,
      type: "website",
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ItemDetailRoute({ params }: { params: Promise<PageParams> }) {
  const { locale, categorySlug, itemSlug } = await params;

  const categories = await getCategoriesFromServer();
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) {
    notFound();
  }

  const tNav = await getTranslations({ locale, namespace: "Nav" });

  if (isVehicleCategory(categories, category.id)) {
    const id = parseVehicleListingIdFromSlug(itemSlug);
    const listing = id != null ? await getVehicleListingFromServer(id) : null;
    if (!listing) {
      notFound();
    }

    const breadcrumbChain = getAncestorChain(categories, listing.vehicleCatalog.category.id);
    const allListings = await getVehicleListingsFromServer(listing.vehicleCatalog.category.id);
    const similarListings = allListings.filter((item) => item.id !== listing.id).slice(0, 12);

    const title = [listing.vehicleCatalog.brand.name, listing.vehicleCatalog.model.name]
      .filter(Boolean)
      .join(" ");
    const pathname = `/${listing.vehicleCatalog.category.slug}/${buildVehicleListingSlug(listing)}`;
    const canonicalUrl = getAlternateLanguages(pathname)[locale];
    const images = listing.images
      .map((image) => resolveMediaUrl(image.imageUrl))
      .filter((url): url is string => Boolean(url));

    const vehicleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: title,
      image: images.length > 0 ? images : undefined,
      description: (() => {
        const raw =
          locale === "en"
            ? listing.descriptionEn
            : locale === "ru"
              ? listing.descriptionRu
              : listing.descriptionKa;
        return raw ? stripHtml(raw) : undefined;
      })(),
      brand: { "@type": "Brand", name: listing.vehicleCatalog.brand.name },
      offers: {
        "@type": "Offer",
        // price/discountPrice are stored in the listing's own currency (an
        // admin can price a listing in GEL or USD), so the currency must come
        // from the listing too — a hardcoded "GEL" told Google a $8,000 bike
        // cost ₾8,000.
        priceCurrency: listing.priceCurrency,
        price: listing.activeDiscount?.discountPrice ?? listing.price,
        availability:
          listing.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url: canonicalUrl,
      },
    };

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
        ...breadcrumbChain.map((ancestor, index) => ({
          "@type": "ListItem",
          position: index + 2,
          name: ancestor.name[locale],
          item: getAlternateLanguages(`/${ancestor.slug}`)[locale],
        })),
        {
          "@type": "ListItem",
          position: breadcrumbChain.length + 2,
          name: title,
          item: canonicalUrl,
        },
      ],
    };

    return (
      <>
        <JsonLd data={vehicleJsonLd} />
        <JsonLd data={breadcrumbJsonLd} />
        <VehicleListingDetailPage
          listing={listing}
          breadcrumbChain={breadcrumbChain}
          similarListings={similarListings}
        />
      </>
    );
  }

  const selectedVehicleCatalogId = (await cookies()).get(SELECTED_VEHICLE_COOKIE)?.value;
  const product = await getProductDetailFromServer(itemSlug, selectedVehicleCatalogId);
  if (!product) {
    notFound();
  }

  const productCategory = categories.find((item) => item.slug === product.category.slug);
  const breadcrumbChain = productCategory ? getAncestorChain(categories, productCategory.id) : [];

  // Algorithmic FBT is only fetched as a fallback for when the admin hasn't
  // curated a buyTogether list for this product (see BuyTogether.tsx vs the
  // new FrequentlyBoughtTogether.tsx) — no point paying for the extra query
  // when there's already a curated list to show.
  const [similarProducts, frequentlyBoughtTogether, viewedTogether] = await Promise.all([
    getSimilarProductsFromServer(product.id, selectedVehicleCatalogId),
    product.buyTogether.length === 0
      ? getFrequentlyBoughtTogetherFromServer(product.id, selectedVehicleCatalogId)
      : Promise.resolve([]),
    getViewedTogetherFromServer(product.id, selectedVehicleCatalogId),
  ]);

  const pathname = `/${product.category.slug}/${itemSlug}`;
  const canonicalUrl = getAlternateLanguages(pathname)[locale];

  const images = product.variants
    .flatMap((variant) => variant.images.map((image) => resolveMediaUrl(image.imageUrl)))
    .filter((url): url is string => Boolean(url));
  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
  const effectivePrices = product.variants.map(
    (variant) => variant.activeDiscount?.discountPrice ?? variant.price,
  );

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name[locale],
    image: images.length > 0 ? images : undefined,
    description: (() => {
      const raw =
        locale === "en" ? product.descriptionEn : locale === "ru" ? product.descriptionRu : product.descriptionKa;
      return raw ? stripHtml(raw) : undefined;
    })(),
    brand: product.productBrand ? { "@type": "Brand", name: product.productBrand.name } : undefined,
    offers:
      effectivePrices.length > 0
        ? {
            "@type": effectivePrices.length > 1 ? "AggregateOffer" : "Offer",
            priceCurrency: "GEL",
            ...(effectivePrices.length > 1
              ? { lowPrice: Math.min(...effectivePrices), highPrice: Math.max(...effectivePrices) }
              : { price: effectivePrices[0] }),
            availability:
              totalStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: canonicalUrl,
          }
        : undefined,
  };

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
      ...breadcrumbChain.map((ancestor, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: ancestor.name[locale],
        item: getAlternateLanguages(`/${ancestor.slug}`)[locale],
      })),
      {
        "@type": "ListItem",
        position: breadcrumbChain.length + 2,
        name: product.name[locale],
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <ProductDetailPage
        product={product}
        breadcrumbChain={breadcrumbChain}
        similarProducts={similarProducts}
        frequentlyBoughtTogether={frequentlyBoughtTogether}
        viewedTogether={viewedTogether}
      />
    </>
  );
}

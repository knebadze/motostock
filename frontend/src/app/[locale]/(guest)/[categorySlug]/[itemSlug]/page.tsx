import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getCategoriesFromServer,
  getCategorySlugRedirectFromServer,
  getFrequentlyBoughtTogetherFromServer,
  getProductSlugRedirectFromServer,
  getProductDetailFromServer,
  getSimilarProductsFromServer,
  getVehicleListingFromServer,
  getSimilarVehicleListingsFromServer,
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
import { buildSocialMetadata } from "@/lib/share-metadata";
import { permanentRedirect } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";

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
    // Link previews lead with the price (+ year in the title) — what someone
    // sharing a bike in a chat actually wants the other person to see.
    const shareTitle = `${title} ${listing.year} — ${siteConfig.name}`;
    const sharePrice = formatPrice(
      listing.activeDiscount?.discountPrice ?? listing.price,
      listing.priceCurrency,
    );

    return {
      title: fullTitle,
      description,
      alternates: {
        canonical: buildCanonicalUrl(pathname, locale),
        languages: getAlternateLanguages(pathname),
      },
      ...(await buildSocialMetadata({
        locale,
        title: shareTitle,
        description: `${sharePrice} · ${description}`,
        pathname,
        imageSrc: listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl,
      })),
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
  // Link previews lead with the price shoppers would actually pay (the
  // cheapest active variant, discounted if on sale).
  const lowestPrice = Math.min(
    ...product.variants.map((variant) => variant.activeDiscount?.discountPrice ?? variant.price),
  );
  const shareDescription = Number.isFinite(lowestPrice) ? `${formatPrice(lowestPrice)} · ${description}` : description;

  return {
    title,
    description,
    alternates: {
      canonical: buildCanonicalUrl(pathname, locale),
      languages: getAlternateLanguages(pathname),
    },
    ...(await buildSocialMetadata({
      locale,
      title,
      description: shareDescription,
      pathname,
      imageSrc: product.variants[0]?.images[0]?.imageUrl ?? product.imageUrl,
    })),
  };
}

export default async function ItemDetailRoute({ params }: { params: Promise<PageParams> }) {
  const { locale, categorySlug, itemSlug } = await params;

  const categories = await getCategoriesFromServer();
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) {
    // A renamed category's old URL — 301 to its current slug (the item
    // itself is re-checked on the next request).
    const moved = await getCategorySlugRedirectFromServer(categorySlug);
    if (moved) {
      permanentRedirect({ href: `/${moved.slug}/${itemSlug}`, locale });
    }
    notFound();
  }

  const tNav = await getTranslations({ locale, namespace: "Nav" });

  if (isVehicleCategory(categories, category.id)) {
    const id = parseVehicleListingIdFromSlug(itemSlug);
    const listing = id != null ? await getVehicleListingFromServer(id) : null;
    if (!listing) {
      notFound();
    }

    // Only the id is read from the URL, so any category path or slug prefix
    // used to render the same listing — duplicates the canonical tag only
    // hinted at. Now one URL: everything else 301s to it (also covers old
    // bare-id links and a renamed brand/model).
    const canonicalCategorySlug = listing.vehicleCatalog.category.slug;
    const canonicalItemSlug = buildVehicleListingSlug(listing);
    if (categorySlug !== canonicalCategorySlug || itemSlug !== canonicalItemSlug) {
      permanentRedirect({ href: `/${canonicalCategorySlug}/${canonicalItemSlug}`, locale });
    }

    const breadcrumbChain = getAncestorChain(categories, listing.vehicleCatalog.category.id);
    const similarListings = await getSimilarVehicleListingsFromServer(
      listing.vehicleCatalog.category.id,
      listing.id,
    );

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
    // A renamed product's old slug — 301 to its current URL.
    const moved = await getProductSlugRedirectFromServer(itemSlug);
    if (moved) {
      permanentRedirect({ href: `/${moved.categorySlug}/${moved.slug}`, locale });
    }
    notFound();
  }
  // Products are looked up by slug alone, so the same product used to
  // render under any category in the path — 301 to its real one.
  if (product.category.slug !== categorySlug) {
    permanentRedirect({ href: `/${product.category.slug}/${product.slug}`, locale });
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

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getCategoriesFromServer,
  getProductDetailFromServer,
  getProductsFromServer,
  getVehicleListingFromServer,
  getVehicleListingsFromServer,
} from "@/lib/api/server";
import { getAncestorChain, isVehicleCategory } from "@/lib/categories-tree";
import { buildCanonicalUrl, getAlternateLanguages } from "@/lib/seo";
import { resolveMediaUrl } from "@/lib/api/client";
import { siteConfig } from "@/config/site";
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
    const id = Number(itemSlug);
    const listing = Number.isInteger(id) ? await getVehicleListingFromServer(id) : null;
    if (!listing) return {};

    const title = [listing.vehicleCatalog.brand.name[locale], listing.vehicleCatalog.model.name[locale]]
      .filter(Boolean)
      .join(" ");
    const fullTitle = `${title} — ${siteConfig.name}`;
    const rawDescription =
      locale === "en" ? listing.descriptionEn : locale === "ru" ? listing.descriptionRu : listing.descriptionKa;
    const description = rawDescription ? stripHtml(rawDescription).slice(0, 200) : fullTitle;
    const pathname = `/${listing.vehicleCatalog.category.slug}/${listing.id}`;
    const image = resolveMediaUrl(listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl);

    return {
      title: fullTitle,
      description,
      alternates: {
        canonical: buildCanonicalUrl(pathname, locale),
        languages: getAlternateLanguages(pathname),
      },
      openGraph: { title: fullTitle, description, images: image ? [image] : undefined },
    };
  }

  const product = await getProductDetailFromServer(itemSlug);
  if (!product) return {};

  const title = `${product.name[locale]} — ${siteConfig.name}`;
  const rawDescription =
    product.metaDescription ??
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
    openGraph: {
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
    const id = Number(itemSlug);
    const listing = Number.isInteger(id) ? await getVehicleListingFromServer(id) : null;
    if (!listing) {
      notFound();
    }

    const breadcrumbChain = getAncestorChain(categories, listing.vehicleCatalog.category.id);
    const allListings = await getVehicleListingsFromServer(listing.vehicleCatalog.category.id);
    const similarListings = allListings.filter((item) => item.id !== listing.id).slice(0, 12);

    const title = [listing.vehicleCatalog.brand.name[locale], listing.vehicleCatalog.model.name[locale]]
      .filter(Boolean)
      .join(" ");
    const pathname = `/${listing.vehicleCatalog.category.slug}/${listing.id}`;
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
      brand: { "@type": "Brand", name: listing.vehicleCatalog.brand.name[locale] },
      offers: {
        "@type": "Offer",
        priceCurrency: "GEL",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(vehicleJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <VehicleListingDetailPage
          listing={listing}
          breadcrumbChain={breadcrumbChain}
          similarListings={similarListings}
        />
      </>
    );
  }

  const product = await getProductDetailFromServer(itemSlug);
  if (!product) {
    notFound();
  }

  const productCategory = categories.find((item) => item.slug === product.category.slug);
  const breadcrumbChain = productCategory ? getAncestorChain(categories, productCategory.id) : [];

  const categoryProducts = await getProductsFromServer(product.category.id);
  const similarProducts = categoryProducts
    .filter((item) => item.id !== product.id)
    .slice(0, 12);

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
    brand: product.productBrand ? { "@type": "Brand", name: product.productBrand.name[locale] } : undefined,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetailPage
        product={product}
        breadcrumbChain={breadcrumbChain}
        similarProducts={similarProducts}
      />
    </>
  );
}

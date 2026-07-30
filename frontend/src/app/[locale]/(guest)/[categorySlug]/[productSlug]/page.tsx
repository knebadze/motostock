import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getCategoriesFromServer,
  getProductDetailFromServer,
  getProductsFromServer,
} from "@/lib/api/server";
import { getAncestorChain } from "@/lib/categories-tree";
import { buildCanonicalUrl, getAlternateLanguages } from "@/lib/seo";
import { resolveMediaUrl } from "@/lib/api/client";
import { siteConfig } from "@/config/site";
import { ProductDetailPage } from "@/components/shop/product-detail/ProductDetailPage";

type Locale = "ka" | "en" | "ru";
type PageParams = { locale: Locale; categorySlug: string; productSlug: string };

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, productSlug } = await params;
  const product = await getProductDetailFromServer(productSlug);
  if (!product) return {};

  const title = `${product.name[locale]} — ${siteConfig.name}`;
  const rawDescription =
    product.metaDescription ??
    (locale === "en" ? product.descriptionEn : locale === "ru" ? product.descriptionRu : product.descriptionKa);
  const description = rawDescription ? stripHtml(rawDescription).slice(0, 200) : title;
  const pathname = `/${product.category.slug}/${productSlug}`;
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

export default async function ProductDetailRoute({ params }: { params: Promise<PageParams> }) {
  const { locale, productSlug } = await params;

  const product = await getProductDetailFromServer(productSlug);
  if (!product) {
    notFound();
  }

  const categories = await getCategoriesFromServer();
  const category = categories.find((item) => item.slug === product.category.slug);
  const breadcrumbChain = category ? getAncestorChain(categories, category.id) : [];

  const categoryProducts = await getProductsFromServer(product.category.id);
  const similarProducts = categoryProducts
    .filter((item) => item.id !== product.id)
    .slice(0, 12);

  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const pathname = `/${product.category.slug}/${productSlug}`;
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

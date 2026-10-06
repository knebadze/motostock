import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getProductsFromServer, getVehicleCatalogEntryFromServer } from "@/lib/api/server";
import { buildCanonicalUrl, getAlternateLanguages } from "@/lib/seo";
import { formatVehicleCatalogLabel } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { CompatibleProductsPage } from "@/components/shop/CompatibleProductsPage";
import { buildSocialMetadata } from "@/lib/share-metadata";

type PageParams = { locale: "ka" | "en" | "ru"; vehicleCatalogId: string };

function parseVehicleCatalogId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Was a blanket noindex — but "parts for <brand> <model>" is exactly the
// search this shop most wants to rank for, and this page is the answer.
// Indexable now with its own title/description/canonical/hreflang. A
// vehicle with zero compatible products stays noindex: an empty page is
// thin content that would only dilute the site in Google's eyes. Both
// fetches are cache()'d, so the page body below reuses them.
export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale, vehicleCatalogId } = await params;
  const id = parseVehicleCatalogId(vehicleCatalogId);
  if (id == null) return {};

  const vehicle = await getVehicleCatalogEntryFromServer(id);
  if (!vehicle) return {};
  const products = await getProductsFromServer(undefined, id);

  const t = await getTranslations({ locale, namespace: "Metadata" });
  const vehicleLabel = formatVehicleCatalogLabel(vehicle);
  const title = t("compatibleProductsTitle", { vehicle: vehicleLabel, siteName: siteConfig.name });
  const description = t("compatibleProductsDescription", {
    vehicle: vehicleLabel,
    siteName: siteConfig.name,
    count: products.length,
  });
  const pathname = `/compatible-products/${id}`;

  return {
    title,
    description,
    robots: products.length === 0 ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: buildCanonicalUrl(pathname, locale),
      languages: getAlternateLanguages(pathname),
    },
    ...(await buildSocialMetadata({ locale, title, description, pathname, imageSrc: vehicle.imageUrl })),
  };
}

export default async function VehicleCompatibleProductsPage({
  params,
}: {
  params: Promise<{ vehicleCatalogId: string }>;
}) {
  const { vehicleCatalogId } = await params;
  const id = parseVehicleCatalogId(vehicleCatalogId);
  if (id == null) {
    notFound();
  }

  const vehicle = await getVehicleCatalogEntryFromServer(id);
  if (!vehicle) {
    notFound();
  }

  const products = await getProductsFromServer(undefined, id);

  return <CompatibleProductsPage vehicle={vehicle} products={products} />;
}

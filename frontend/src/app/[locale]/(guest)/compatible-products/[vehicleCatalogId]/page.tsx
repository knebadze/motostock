import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getProductsFromServer, getVehicleCatalogEntryFromServer } from "@/lib/api/server";
import { buildVehicleCatalogSlug, parseVehicleCatalogIdFromSlug } from "@/lib/api/vehicle-catalog";
import { permanentRedirect } from "@/i18n/navigation";
import { buildCanonicalUrl, getAlternateLanguages } from "@/lib/seo";
import { formatVehicleCatalogLabel } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { CompatibleProductsPage } from "@/components/shop/CompatibleProductsPage";
import { buildSocialMetadata } from "@/lib/share-metadata";

// The segment is the slug "honda-cbr600rr-2007-2012-123" (see
// buildVehicleCatalogSlug) — the folder keeps its old [vehicleCatalogId]
// name; only the trailing id is read from it.
type PageParams = { locale: "ka" | "en" | "ru"; vehicleCatalogId: string };

// Was a blanket noindex — but "parts for <brand> <model>" is exactly the
// search this shop most wants to rank for, and this page is the answer.
// Indexable now with its own title/description/canonical/hreflang. A
// vehicle with zero compatible products stays noindex: an empty page is
// thin content that would only dilute the site in Google's eyes. Both
// fetches are cache()'d, so the page body below reuses them.
export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale, vehicleCatalogId } = await params;
  const id = parseVehicleCatalogIdFromSlug(vehicleCatalogId);
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
  const pathname = `/compatible-products/${buildVehicleCatalogSlug(vehicle)}`;

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
  params: Promise<PageParams>;
}) {
  const { locale, vehicleCatalogId } = await params;
  const id = parseVehicleCatalogIdFromSlug(vehicleCatalogId);
  if (id == null) {
    notFound();
  }

  const vehicle = await getVehicleCatalogEntryFromServer(id);
  if (!vehicle) {
    notFound();
  }

  // One URL per vehicle: the old bare-id links (/compatible-products/123)
  // and any outdated slug (brand/model renamed) get a 301 to the current
  // slugged form, so search engines consolidate on it.
  const canonicalSlug = buildVehicleCatalogSlug(vehicle);
  if (vehicleCatalogId !== canonicalSlug) {
    permanentRedirect({ href: `/compatible-products/${canonicalSlug}`, locale });
  }

  const products = await getProductsFromServer(undefined, id);

  return <CompatibleProductsPage vehicle={vehicle} products={products} />;
}

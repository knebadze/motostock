import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductsFromServer, getVehicleCatalogEntryFromServer } from "@/lib/api/server";
import { CompatibleProductsPage } from "@/components/shop/CompatibleProductsPage";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function VehicleCompatibleProductsPage({
  params,
}: {
  params: Promise<{ vehicleCatalogId: string }>;
}) {
  const { vehicleCatalogId } = await params;
  const id = Number(vehicleCatalogId);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const vehicle = await getVehicleCatalogEntryFromServer(id);
  if (!vehicle) {
    notFound();
  }

  const products = await getProductsFromServer(undefined, id);

  return <CompatibleProductsPage vehicle={vehicle} products={products} />;
}

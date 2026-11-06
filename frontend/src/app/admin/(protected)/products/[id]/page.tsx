import { notFound } from "next/navigation";
import {
  getCategoriesFromServer,
  getLookupItemsFromServer,
  getProductFromServer,
  getTagsFromServer,
  getProductTagsFromServer,
} from "@/lib/api/server";
import { ProductForm } from "@/components/admin/products/ProductForm";
import type { VehicleSpecLookupMap } from "@/components/admin/products/ProductFitmentPanel";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    product,
    categories,
    sizes,
    colors,
    conditions,
    statuses,
    fuelTypes,
    transmissionTypes,
    coolingTypes,
    finalDriveTypes,
    driveTypes,
    startTypes,
    powertrainTypes,
    tags,
    productTags,
  ] = await Promise.all([
    getProductFromServer(Number(id)),
    getCategoriesFromServer(),
    getLookupItemsFromServer("sizes"),
    getLookupItemsFromServer("colors"),
    getLookupItemsFromServer("conditions"),
    getLookupItemsFromServer("listing-statuses"),
    getLookupItemsFromServer("fuel-types"),
    getLookupItemsFromServer("transmission-types"),
    getLookupItemsFromServer("cooling-types"),
    getLookupItemsFromServer("final-drive-types"),
    getLookupItemsFromServer("drive-types"),
    getLookupItemsFromServer("start-types"),
    getLookupItemsFromServer("powertrain-types"),
    getTagsFromServer(),
    getProductTagsFromServer(Number(id)),
  ]);

  if (!product) {
    notFound();
  }

  const vehicleSpecLookups: VehicleSpecLookupMap = {
    FUEL_TYPE: fuelTypes,
    TRANSMISSION_TYPE: transmissionTypes,
    COOLING_TYPE: coolingTypes,
    FINAL_DRIVE_TYPE: finalDriveTypes,
    DRIVE_TYPE: driveTypes,
    START_TYPE: startTypes,
    POWERTRAIN_TYPE: powertrainTypes,
  };

  return (
    <ProductForm
      categories={categories}
      sizes={sizes}
      colors={colors}
      conditions={conditions}
      statuses={statuses}
      vehicleSpecLookups={vehicleSpecLookups}
      product={product}
      tags={tags}
      initialTagIds={productTags.map((tag) => tag.id)}
    />
  );
}

import {
  getCategoriesFromServer,
  getLookupItemsFromServer,
  getTagsFromServer,
} from "@/lib/api/server";
import { ProductForm } from "@/components/admin/products/ProductForm";
import type { VehicleSpecLookupMap } from "@/components/admin/products/ProductFitmentPanel";

export default async function NewProductPage() {
  const [
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
  ] = await Promise.all([
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
  ]);

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
      product={null}
      tags={tags}
    />
  );
}

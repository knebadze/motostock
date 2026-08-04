import {
  getCategoriesFromServer,
  getLookupItemsFromServer,
  getVehicleCatalogFromServer,
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
    vehicleCatalog,
    fuelTypes,
    transmissionTypes,
    coolingTypes,
    finalDriveTypes,
    driveTypes,
    startTypes,
    powertrainTypes,
  ] = await Promise.all([
    getCategoriesFromServer(),
    getLookupItemsFromServer("sizes"),
    getLookupItemsFromServer("colors"),
    getLookupItemsFromServer("conditions"),
    getLookupItemsFromServer("listing-statuses"),
    getVehicleCatalogFromServer(),
    getLookupItemsFromServer("fuel-types"),
    getLookupItemsFromServer("transmission-types"),
    getLookupItemsFromServer("cooling-types"),
    getLookupItemsFromServer("final-drive-types"),
    getLookupItemsFromServer("drive-types"),
    getLookupItemsFromServer("start-types"),
    getLookupItemsFromServer("powertrain-types"),
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
      vehicleCatalog={vehicleCatalog}
      vehicleSpecLookups={vehicleSpecLookups}
      product={null}
    />
  );
}

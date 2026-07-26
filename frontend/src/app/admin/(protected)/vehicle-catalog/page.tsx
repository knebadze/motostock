import {
  getBrandsFromServer,
  getCategoriesFromServer,
  getLookupItemsFromServer,
  getModelsFromServer,
  getVehicleCatalogFromServer,
} from "@/lib/api/server";
import { VehicleCatalogManager } from "@/components/admin/vehicle-catalog/VehicleCatalogManager";

export default async function VehicleCatalogPage() {
  const [
    entries,
    categories,
    brands,
    models,
    fuelTypes,
    transmissionTypes,
    coolingTypes,
    finalDriveTypes,
    driveTypes,
    startTypes,
    powertrainTypes,
  ] = await Promise.all([
    getVehicleCatalogFromServer(),
    getCategoriesFromServer(),
    getBrandsFromServer(),
    getModelsFromServer(),
    getLookupItemsFromServer("fuel-types"),
    getLookupItemsFromServer("transmission-types"),
    getLookupItemsFromServer("cooling-types"),
    getLookupItemsFromServer("final-drive-types"),
    getLookupItemsFromServer("drive-types"),
    getLookupItemsFromServer("start-types"),
    getLookupItemsFromServer("powertrain-types"),
  ]);

  return (
    <VehicleCatalogManager
      initialEntries={entries}
      categories={categories}
      brands={brands}
      models={models}
      fuelTypes={fuelTypes}
      transmissionTypes={transmissionTypes}
      coolingTypes={coolingTypes}
      finalDriveTypes={finalDriveTypes}
      driveTypes={driveTypes}
      startTypes={startTypes}
      powertrainTypes={powertrainTypes}
    />
  );
}

import {
  getBrandsFromServer,
  getCategoriesFromServer,
  getLookupItemsFromServer,
  getModelsFromServer,
  getVehicleCatalogPageFromServer,
} from "@/lib/api/server";
import { VehicleCatalogManager } from "@/components/admin/vehicle-catalog/VehicleCatalogManager";

export default async function VehicleCatalogPage() {
  const [
    initialData,
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
    getVehicleCatalogPageFromServer(),
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
      initialData={initialData}
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

import {
  getAdminVehicleListingsFromServer,
  getLookupItemsFromServer,
  getVehicleCatalogFromServer,
} from "@/lib/api/server";
import { VehicleListingsManager } from "@/components/admin/vehicle-listings/VehicleListingsManager";

export default async function VehicleListingsPage() {
  const [listings, vehicleCatalog, conditions, statuses, colors] = await Promise.all([
    getAdminVehicleListingsFromServer(),
    getVehicleCatalogFromServer(),
    getLookupItemsFromServer("conditions"),
    getLookupItemsFromServer("listing-statuses"),
    getLookupItemsFromServer("colors"),
  ]);

  return (
    <VehicleListingsManager
      initialData={listings}
      vehicleCatalog={vehicleCatalog}
      conditions={conditions}
      statuses={statuses}
      colors={colors}
    />
  );
}

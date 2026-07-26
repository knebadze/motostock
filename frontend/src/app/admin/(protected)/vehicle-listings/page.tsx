import {
  getLookupItemsFromServer,
  getVehicleCatalogFromServer,
  getVehicleListingsFromServer,
} from "@/lib/api/server";
import { VehicleListingsManager } from "@/components/admin/vehicle-listings/VehicleListingsManager";

export default async function VehicleListingsPage() {
  const [listings, vehicleCatalog, conditions, statuses, colors] = await Promise.all([
    getVehicleListingsFromServer(),
    getVehicleCatalogFromServer(),
    getLookupItemsFromServer("conditions"),
    getLookupItemsFromServer("listing-statuses"),
    getLookupItemsFromServer("colors"),
  ]);

  return (
    <VehicleListingsManager
      initialListings={listings}
      vehicleCatalog={vehicleCatalog}
      conditions={conditions}
      statuses={statuses}
      colors={colors}
    />
  );
}

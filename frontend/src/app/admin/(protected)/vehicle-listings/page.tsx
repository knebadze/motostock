import {
  getAdminVehicleListingsFromServer,
  getLookupItemsFromServer,
  getVehicleCatalogFromServer,
} from "@/lib/api/server";
import { VehicleListingsManager } from "@/components/admin/vehicle-listings/VehicleListingsManager";
import { buildVehicleListingFilterRefs } from "@/config/admin-filters/vehicle-listing-filters";

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
      // Only the filters' brand/model/category lists reach the browser; the
      // form's catalog picker searches the server.
      filterRefs={buildVehicleListingFilterRefs(vehicleCatalog)}
      canCreate={vehicleCatalog.length > 0}
      conditions={conditions}
      statuses={statuses}
      colors={colors}
    />
  );
}

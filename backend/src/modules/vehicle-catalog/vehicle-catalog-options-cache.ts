import { cache } from "../../lib/cache.js";

// The lean picker list (GET /vehicle-catalog/options — every catalog entry
// with brand/model/category names) is cached with no expiry. It's a
// ~3,500-row, four-table read that the storefront (homepage search,
// checkout, garage, fit badge) and admin pickers all hit, and it only
// changes through catalog/brand/model/category writes — each of which
// calls invalidateVehicleCatalogOptions(). The admin "clear cache" button
// (cache.clear()) drops it too. Kept in its own module so the brand/model/
// category services can invalidate it without importing vehicle-catalog.service.
export const VEHICLE_CATALOG_OPTIONS_CACHE_KEY = "vehicleCatalog:options";

export function invalidateVehicleCatalogOptions() {
  cache.del(VEHICLE_CATALOG_OPTIONS_CACHE_KEY);
}

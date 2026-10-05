import { createDiscountCollectionApi } from "./collection-discount-api";
import type { CollectionDiscountInput } from "./collection-discount-api";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type VehicleListingDiscount = Schemas["VehicleListingDiscount"];
export type VehicleListingDiscountInput = CollectionDiscountInput;

const vehicleListingDiscountsApi = createDiscountCollectionApi<VehicleListingDiscount>(
  (listingId) => `/vehicle-listings/${listingId}/discounts`,
);

export const listVehicleListingDiscounts = vehicleListingDiscountsApi.list;
export const createVehicleListingDiscount = vehicleListingDiscountsApi.create;
export const deleteVehicleListingDiscount = vehicleListingDiscountsApi.remove;

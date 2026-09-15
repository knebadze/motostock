import { createDiscountCollectionApi } from "./collection-discount-api";
import type { CollectionDiscountBase, CollectionDiscountInput } from "./collection-discount-api";

export type VehicleListingDiscount = CollectionDiscountBase & { vehicleListingId: number };
export type VehicleListingDiscountInput = CollectionDiscountInput;

const vehicleListingDiscountsApi = createDiscountCollectionApi<VehicleListingDiscount>(
  (listingId) => `/vehicle-listings/${listingId}/discounts`,
);

export const listVehicleListingDiscounts = vehicleListingDiscountsApi.list;
export const createVehicleListingDiscount = vehicleListingDiscountsApi.create;
export const deleteVehicleListingDiscount = vehicleListingDiscountsApi.remove;

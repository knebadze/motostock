import { createImageCollectionApi } from "./collection-image-api";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type VehicleListingImage = Schemas["VehicleListingImage"];

const vehicleListingImagesApi = createImageCollectionApi(
  (listingId) => `/vehicle-listings/${listingId}/images`,
);

export const listVehicleListingImages = vehicleListingImagesApi.list;
export const uploadVehicleListingImages = vehicleListingImagesApi.upload;
export const reorderVehicleListingImages = vehicleListingImagesApi.reorder;
export const deleteVehicleListingImage = vehicleListingImagesApi.remove;

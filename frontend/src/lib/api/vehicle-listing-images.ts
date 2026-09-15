import { createImageCollectionApi } from "./collection-image-api";
import type { CollectionImage } from "./collection-image-api";

export type VehicleListingImage = CollectionImage;

const vehicleListingImagesApi = createImageCollectionApi(
  (listingId) => `/vehicle-listings/${listingId}/images`,
);

export const listVehicleListingImages = vehicleListingImagesApi.list;
export const uploadVehicleListingImages = vehicleListingImagesApi.upload;
export const reorderVehicleListingImages = vehicleListingImagesApi.reorder;
export const deleteVehicleListingImage = vehicleListingImagesApi.remove;

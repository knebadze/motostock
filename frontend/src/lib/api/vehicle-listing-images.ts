import { apiClient } from "./client";

export type VehicleListingImage = {
  id: number;
  imageUrl: string;
  position: number;
};

export async function listVehicleListingImages(
  listingId: number,
): Promise<VehicleListingImage[]> {
  const { data } = await apiClient.get<{ items: VehicleListingImage[] }>(
    `/vehicle-listings/${listingId}/images`,
  );
  return data.items;
}

export async function uploadVehicleListingImages(
  listingId: number,
  files: File[],
): Promise<VehicleListingImage[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const { data } = await apiClient.post<{ items: VehicleListingImage[] }>(
    `/vehicle-listings/${listingId}/images`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.items;
}

export async function reorderVehicleListingImages(
  listingId: number,
  imageIds: number[],
): Promise<VehicleListingImage[]> {
  const { data } = await apiClient.put<{ items: VehicleListingImage[] }>(
    `/vehicle-listings/${listingId}/images/order`,
    { imageIds },
  );
  return data.items;
}

export async function deleteVehicleListingImage(
  listingId: number,
  imageId: number,
): Promise<void> {
  await apiClient.delete(`/vehicle-listings/${listingId}/images/${imageId}`);
}

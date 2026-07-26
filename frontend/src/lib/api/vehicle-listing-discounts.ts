import { apiClient } from "./client";

export type VehicleListingDiscount = {
  id: number;
  vehicleListingId: number;
  discountPrice: number;
  discountPercent: number | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
};

export type VehicleListingDiscountInput = {
  discountPrice: number;
  discountPercent?: number | null;
  startDate: string;
  endDate: string;
};

export async function listVehicleListingDiscounts(
  listingId: number,
): Promise<VehicleListingDiscount[]> {
  const { data } = await apiClient.get<{ items: VehicleListingDiscount[] }>(
    `/vehicle-listings/${listingId}/discounts`,
  );
  return data.items;
}

export async function createVehicleListingDiscount(
  listingId: number,
  input: VehicleListingDiscountInput,
): Promise<VehicleListingDiscount> {
  const { data } = await apiClient.post<{ item: VehicleListingDiscount }>(
    `/vehicle-listings/${listingId}/discounts`,
    input,
  );
  return data.item;
}

export async function deleteVehicleListingDiscount(
  listingId: number,
  id: number,
): Promise<void> {
  await apiClient.delete(`/vehicle-listings/${listingId}/discounts/${id}`);
}

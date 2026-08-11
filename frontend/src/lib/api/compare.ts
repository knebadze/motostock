import { apiClient } from "./client";
import type { Product } from "./products";
import type { VehicleListing } from "./vehicle-listings";

export type CompareItemType = "PRODUCT" | "VEHICLE_LISTING";

export type CompareItem = {
  id: number;
  itemType: CompareItemType;
  product: Product | null;
  vehicleListing: VehicleListing | null;
  createdAt: string;
};

export type CompareStatusItem = {
  id: number;
  productId: number | null;
  vehicleListingId: number | null;
};

export type CompareStatus = {
  items: CompareStatusItem[];
};

export async function listMyCompare(): Promise<CompareItem[]> {
  const { data } = await apiClient.get<{ items: CompareItem[] }>("/users/me/compare");
  return data.items;
}

export async function addToCompare(
  input:
    | { itemType: "PRODUCT"; productId: number }
    | { itemType: "VEHICLE_LISTING"; vehicleListingId: number },
): Promise<CompareItem> {
  const { data } = await apiClient.post<{ item: CompareItem }>("/users/me/compare", input);
  return data.item;
}

export async function removeFromCompare(id: number): Promise<void> {
  await apiClient.delete(`/users/me/compare/${id}`);
}

export async function getCompareStatus(
  productIds: number[],
  vehicleListingIds: number[],
): Promise<CompareStatus> {
  if (productIds.length === 0 && vehicleListingIds.length === 0) {
    return { items: [] };
  }

  const { data } = await apiClient.get<CompareStatus>("/users/me/compare/status", {
    params: { productIds, vehicleListingIds },
  });
  return data;
}

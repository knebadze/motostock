import { apiClient } from "./client";
import type { Product } from "./products";
import type { VehicleListing } from "./vehicle-listings";

export type CollectionItemType = "PRODUCT" | "VEHICLE_LISTING";

export type CollectionItem = {
  id: number;
  itemType: CollectionItemType;
  product: Product | null;
  vehicleListing: VehicleListing | null;
  createdAt: string;
};

export type CollectionStatusItem = {
  id: number;
  productId: number | null;
  vehicleListingId: number | null;
};

export type CollectionStatus = {
  items: CollectionStatusItem[];
};

export type AddToCollectionInput =
  | { itemType: "PRODUCT"; productId: number }
  | { itemType: "VEHICLE_LISTING"; vehicleListingId: number };

// Shared by wishlist.ts and compare.ts, whose entire API surface — list/add/
// remove/status-check against a per-user collection of products/vehicle
// listings — used to be implemented twice, byte-for-byte identical under a
// Wishlist<->Compare substitution (including the empty-array short-circuit
// in getStatus, which had to be kept correct independently in both copies).
export function createCollectionApi(basePath: string) {
  async function list(): Promise<CollectionItem[]> {
    const { data } = await apiClient.get<{ items: CollectionItem[] }>(basePath);
    return data.items;
  }

  async function add(input: AddToCollectionInput): Promise<CollectionItem> {
    const { data } = await apiClient.post<{ item: CollectionItem }>(basePath, input);
    return data.item;
  }

  async function remove(id: number): Promise<void> {
    await apiClient.delete(`${basePath}/${id}`);
  }

  async function getStatus(
    productIds: number[],
    vehicleListingIds: number[],
  ): Promise<CollectionStatus> {
    if (productIds.length === 0 && vehicleListingIds.length === 0) {
      return { items: [] };
    }

    const { data } = await apiClient.get<CollectionStatus>(`${basePath}/status`, {
      params: { productIds, vehicleListingIds },
    });
    return data;
  }

  return { list, add, remove, getStatus };
}

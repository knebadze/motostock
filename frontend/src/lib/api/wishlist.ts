import { apiClient } from "./client";
import type { Product } from "./products";
import type { VehicleListing } from "./vehicle-listings";

export type WishlistItemType = "PRODUCT" | "VEHICLE_LISTING";

export type WishlistItem = {
  id: number;
  itemType: WishlistItemType;
  product: Product | null;
  vehicleListing: VehicleListing | null;
  createdAt: string;
};

export type WishlistStatusItem = {
  id: number;
  productId: number | null;
  vehicleListingId: number | null;
};

export type WishlistStatus = {
  items: WishlistStatusItem[];
};

export async function listMyWishlist(): Promise<WishlistItem[]> {
  const { data } = await apiClient.get<{ items: WishlistItem[] }>("/users/me/wishlist");
  return data.items;
}

export async function addToWishlist(
  input:
    | { itemType: "PRODUCT"; productId: number }
    | { itemType: "VEHICLE_LISTING"; vehicleListingId: number },
): Promise<WishlistItem> {
  const { data } = await apiClient.post<{ item: WishlistItem }>("/users/me/wishlist", input);
  return data.item;
}

export async function removeFromWishlist(id: number): Promise<void> {
  await apiClient.delete(`/users/me/wishlist/${id}`);
}

export async function getWishlistStatus(
  productIds: number[],
  vehicleListingIds: number[],
): Promise<WishlistStatus> {
  if (productIds.length === 0 && vehicleListingIds.length === 0) {
    return { items: [] };
  }

  const { data } = await apiClient.get<WishlistStatus>("/users/me/wishlist/status", {
    params: { productIds, vehicleListingIds },
  });
  return data;
}

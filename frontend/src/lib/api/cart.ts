import { apiClient } from "./client";
import type { components } from "./generated/schema";
import type { ApiResponse } from "./generated-helpers";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type CartItemType = "PRODUCT_VARIANT" | "VEHICLE_LISTING";

export type CartProductVariant = Schemas["CartProductVariant"];

export type CartItem = Schemas["CartItem"];

export type Cart = Schemas["Cart"];

export async function getMyCart(): Promise<Cart> {
  const { data } = await apiClient.get<Cart>("/users/me/cart");
  return data;
}

export async function getMyCartCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>("/users/me/cart/count");
  return data.count;
}

export async function addToCart(
  input:
    | { itemType: "PRODUCT_VARIANT"; productVariantId: number; quantity?: number }
    | { itemType: "VEHICLE_LISTING"; vehicleListingId: number; quantity?: number },
): Promise<CartItem> {
  const { data } = await apiClient.post<{ item: CartItem }>("/users/me/cart", input);
  return data.item;
}

export async function updateCartItemQuantity(id: number, quantity: number): Promise<CartItem> {
  const { data } = await apiClient.patch<{ item: CartItem }>(`/users/me/cart/${id}`, { quantity });
  return data.item;
}

export async function removeFromCart(id: number): Promise<void> {
  await apiClient.delete(`/users/me/cart/${id}`);
}

export type CartStatusItem = ApiResponse<"/users/me/cart/status", "get">["items"][number];

export async function getCartStatus(
  productVariantIds: number[],
  vehicleListingIds: number[],
): Promise<CartStatusItem[]> {
  if (productVariantIds.length === 0 && vehicleListingIds.length === 0) {
    return [];
  }

  const { data } = await apiClient.get<{ items: CartStatusItem[] }>("/users/me/cart/status", {
    params: { productVariantIds, vehicleListingIds },
  });
  return data.items;
}

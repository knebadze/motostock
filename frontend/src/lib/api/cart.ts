import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { NamedRef } from "./vehicle-catalog";
import type { LookupItem } from "./lookups";
import type { ProductVariantImage } from "./product-variant-images";
import type { ProductVariantDiscount } from "./product-variant-discounts";
import type { VehicleListing } from "./vehicle-listings";

export type CartItemType = "PRODUCT_VARIANT" | "VEHICLE_LISTING";

export type CartProductVariant = {
  id: number;
  product: {
    id: number;
    name: LocalizedString;
    slug: string;
    imageUrl: string | null;
    category: NamedRef;
  };
  size: LookupItem | null;
  color: LookupItem | null;
  price: number;
  stockQuantity: number;
  images: ProductVariantImage[];
  activeDiscount: ProductVariantDiscount | null;
};

export type CartItem = {
  id: number;
  itemType: CartItemType;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productVariant: CartProductVariant | null;
  vehicleListing: VehicleListing | null;
  createdAt: string;
};

export type Cart = {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
};

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

export type CartStatusItem = {
  id: number;
  productVariantId: number | null;
  vehicleListingId: number | null;
  quantity: number;
};

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

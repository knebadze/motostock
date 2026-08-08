import { apiClient } from "./client";
import type { Product } from "./products";
import type { LocalizedString } from "./categories";
import type { NamedRef } from "./vehicle-catalog";

export type ProductBuyTogether = {
  id: number;
  productId: number;
  relatedProduct: Product;
  createdAt: string;
};

// Admin-only unified overview (see /admin/buy-together) — lighter than the
// full Product shape above, only what the cross-product table needs.
export type ProductBuyTogetherRef = { id: number; name: LocalizedString; slug: string; category: NamedRef };

export type AdminProductBuyTogether = {
  id: number;
  product: ProductBuyTogetherRef;
  relatedProduct: ProductBuyTogetherRef;
  createdAt: string;
};

export type ListProductBuyTogetherFilters = {
  search?: string;
  categoryId?: number;
};

export async function listAllProductBuyTogether(
  filters: ListProductBuyTogetherFilters = {},
): Promise<AdminProductBuyTogether[]> {
  const { data } = await apiClient.get<{ items: AdminProductBuyTogether[] }>("/product-buy-together", {
    params: filters,
  });
  return data.items;
}

export async function listProductBuyTogether(productId: number): Promise<ProductBuyTogether[]> {
  const { data } = await apiClient.get<{ items: ProductBuyTogether[] }>(
    `/products/${productId}/buy-together`,
  );
  return data.items;
}

export async function createProductBuyTogether(
  productId: number,
  relatedProductId: number,
): Promise<ProductBuyTogether> {
  const { data } = await apiClient.post<{ item: ProductBuyTogether }>(
    `/products/${productId}/buy-together`,
    { relatedProductId },
  );
  return data.item;
}

export async function deleteProductBuyTogether(productId: number, id: number): Promise<void> {
  await apiClient.delete(`/products/${productId}/buy-together/${id}`);
}

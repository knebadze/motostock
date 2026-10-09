import { apiClient } from "./client";
import type { components } from "./generated/schema";
import type { ApiResponse } from "./generated-helpers";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type ProductBuyTogether = Schemas["ProductBuyTogether"];

// Admin-only unified overview (see /admin/buy-together) — lighter than the
// full Product shape above, only what the cross-product table needs.
export type ProductBuyTogetherRef = AdminProductBuyTogether["product"];

export type AdminProductBuyTogether = Schemas["AdminProductBuyTogether"];

export type ListProductBuyTogetherFilters = {
  search?: string;
  categoryId?: number;
  page?: number;
  pageSize?: number;
};

export type ProductBuyTogetherPage = ApiResponse<"/product-buy-together", "get">;

// Real server-side pagination (skip/take), not the client-side slicing most
// other admin lists use — this table spans every product pair project-wide
// and has no natural cap.
export async function listAllProductBuyTogether(
  filters: ListProductBuyTogetherFilters = {},
): Promise<ProductBuyTogetherPage> {
  const { data } = await apiClient.get<ProductBuyTogetherPage>("/product-buy-together", {
    params: filters,
  });
  return data;
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

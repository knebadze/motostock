import { apiClient } from "./client";
import type { Product } from "./products";

export type ProductBuyTogether = {
  id: number;
  productId: number;
  relatedProduct: Product;
  createdAt: string;
};

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

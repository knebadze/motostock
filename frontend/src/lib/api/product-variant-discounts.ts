import { apiClient } from "./client";

export type ProductVariantDiscount = {
  id: number;
  productVariantId: number;
  discountPrice: number;
  discountPercent: number | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariantDiscountInput = {
  discountPrice: number;
  discountPercent?: number | null;
  startDate: string;
  endDate: string;
};

export async function listProductVariantDiscounts(
  variantId: number,
): Promise<ProductVariantDiscount[]> {
  const { data } = await apiClient.get<{ items: ProductVariantDiscount[] }>(
    `/product-variants/${variantId}/discounts`,
  );
  return data.items;
}

export async function createProductVariantDiscount(
  variantId: number,
  input: ProductVariantDiscountInput,
): Promise<ProductVariantDiscount> {
  const { data } = await apiClient.post<{ item: ProductVariantDiscount }>(
    `/product-variants/${variantId}/discounts`,
    input,
  );
  return data.item;
}

export async function deleteProductVariantDiscount(
  variantId: number,
  id: number,
): Promise<void> {
  await apiClient.delete(`/product-variants/${variantId}/discounts/${id}`);
}

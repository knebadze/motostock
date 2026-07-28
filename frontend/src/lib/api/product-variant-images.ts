import { apiClient } from "./client";

export type ProductVariantImage = {
  id: number;
  imageUrl: string;
  position: number;
};

export async function listProductVariantImages(
  variantId: number,
): Promise<ProductVariantImage[]> {
  const { data } = await apiClient.get<{ items: ProductVariantImage[] }>(
    `/product-variants/${variantId}/images`,
  );
  return data.items;
}

export async function uploadProductVariantImages(
  variantId: number,
  files: File[],
): Promise<ProductVariantImage[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));

  const { data } = await apiClient.post<{ items: ProductVariantImage[] }>(
    `/product-variants/${variantId}/images`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.items;
}

export async function reorderProductVariantImages(
  variantId: number,
  imageIds: number[],
): Promise<ProductVariantImage[]> {
  const { data } = await apiClient.put<{ items: ProductVariantImage[] }>(
    `/product-variants/${variantId}/images/order`,
    { imageIds },
  );
  return data.items;
}

export async function deleteProductVariantImage(
  variantId: number,
  imageId: number,
): Promise<void> {
  await apiClient.delete(`/product-variants/${variantId}/images/${imageId}`);
}

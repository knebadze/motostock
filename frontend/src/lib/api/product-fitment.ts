import { apiClient } from "./client";
import type { BrandModelRef } from "./vehicle-catalog";

export type ProductFitment = {
  id: number;
  productId: number;
  vehicleCatalog: {
    id: number;
    brand: BrandModelRef;
    model: BrandModelRef;
    variant: string;
    yearFrom: number | null;
    yearTo: number | null;
  };
  createdAt: string;
};

export async function listProductFitments(productId: number): Promise<ProductFitment[]> {
  const { data } = await apiClient.get<{ items: ProductFitment[] }>(
    `/products/${productId}/fitments`,
  );
  return data.items;
}

export async function createProductFitment(
  productId: number,
  vehicleCatalogId: number,
): Promise<ProductFitment> {
  const { data } = await apiClient.post<{ item: ProductFitment }>(
    `/products/${productId}/fitments`,
    { vehicleCatalogId },
  );
  return data.item;
}

export async function deleteProductFitment(productId: number, id: number): Promise<void> {
  await apiClient.delete(`/products/${productId}/fitments/${id}`);
}

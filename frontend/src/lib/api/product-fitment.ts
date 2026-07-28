import { apiClient } from "./client";
import type { NamedRef } from "./vehicle-catalog";

export type ProductFitment = {
  id: number;
  productId: number;
  vehicleCatalog: {
    id: number;
    brand: NamedRef;
    model: NamedRef;
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

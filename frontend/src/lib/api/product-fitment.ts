import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type ProductFitment = Schemas["ProductFitment"];

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

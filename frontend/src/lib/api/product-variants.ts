import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type ProductVariant = Schemas["ProductVariant"];

export type ProductVariantInput = Schemas["CreateProductVariantInput"];

export async function listProductVariants(productId?: number): Promise<ProductVariant[]> {
  const { data } = await apiClient.get<{ items: ProductVariant[] }>("/product-variants", {
    params: productId ? { productId } : undefined,
  });
  return data.items;
}

export async function createProductVariant(input: ProductVariantInput): Promise<ProductVariant> {
  const { data } = await apiClient.post<{ item: ProductVariant }>("/product-variants", input);
  return data.item;
}

export async function updateProductVariant(
  id: number,
  input: Partial<ProductVariantInput>,
): Promise<ProductVariant> {
  const { data } = await apiClient.patch<{ item: ProductVariant }>(
    `/product-variants/${id}`,
    input,
  );
  return data.item;
}

export async function deleteProductVariant(id: number): Promise<void> {
  await apiClient.delete(`/product-variants/${id}`);
}

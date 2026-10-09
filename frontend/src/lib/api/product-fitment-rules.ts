import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type ProductFitmentRuleType = "CATEGORY" | "SPEC" | "ALL";

export type ProductFitmentRule = Schemas["ProductFitmentRule"];

export type ProductFitmentRuleInput = Schemas["CreateProductFitmentRuleInput"];

export async function listProductFitmentRules(productId: number): Promise<ProductFitmentRule[]> {
  const { data } = await apiClient.get<{ items: ProductFitmentRule[] }>(
    `/products/${productId}/fitment-rules`,
  );
  return data.items;
}

export async function createProductFitmentRule(
  productId: number,
  input: ProductFitmentRuleInput,
): Promise<ProductFitmentRule> {
  const { data } = await apiClient.post<{ item: ProductFitmentRule }>(
    `/products/${productId}/fitment-rules`,
    input,
  );
  return data.item;
}

export async function deleteProductFitmentRule(productId: number, id: number): Promise<void> {
  await apiClient.delete(`/products/${productId}/fitment-rules/${id}`);
}

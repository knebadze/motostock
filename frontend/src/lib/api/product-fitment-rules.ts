import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { NamedRef } from "./vehicle-catalog";
import type { LookupItem } from "./lookups";
import type { VehicleSpecField } from "./vehicle-category-filters";

export type ProductFitmentRuleType = "CATEGORY" | "SPEC" | "ALL";

export type ProductFitmentRule = {
  id: number;
  productId: number;
  type: ProductFitmentRuleType;
  // Only present when type is "CATEGORY".
  category: NamedRef | null;
  // Only present when type is "SPEC".
  specField: VehicleSpecField | null;
  specFieldLabel: LocalizedString | null;
  specValue: LookupItem | null;
  createdAt: string;
};

export type ProductFitmentRuleInput = {
  type: ProductFitmentRuleType;
  categoryId?: number | null;
  specField?: VehicleSpecField | null;
  specLookupItemId?: number | null;
};

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

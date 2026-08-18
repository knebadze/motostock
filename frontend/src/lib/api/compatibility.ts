import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { BrandModelRef, NamedRef } from "./vehicle-catalog";
import type { LookupItem } from "./lookups";

export type CompatibilityItemKind = "FITMENT" | "RULE_ALL" | "RULE_CATEGORY" | "RULE_SPEC";

export type CompatibleVehicle = {
  id: number;
  brand: BrandModelRef;
  model: BrandModelRef;
  variant: string;
  yearFrom: number | null;
  yearTo: number | null;
};

export type CompatibilityItem = {
  id: string;
  kind: CompatibilityItemKind;
  product: { id: number; name: LocalizedString; slug: string; category: NamedRef };
  vehicle: CompatibleVehicle | null;
  category: NamedRef | null;
  specFieldLabel: LocalizedString | null;
  specValue: LookupItem | null;
  createdAt: string;
};

export type ListCompatibilityFilters = {
  search?: string;
  categoryId?: number;
  kind?: "FITMENT" | "RULE";
};

export async function listCompatibility(
  filters: ListCompatibilityFilters = {},
): Promise<CompatibilityItem[]> {
  const { data } = await apiClient.get<{ items: CompatibilityItem[] }>("/compatibility", {
    params: filters,
  });
  return data.items;
}

export async function getCompatibleVehiclesForProduct(productId: number): Promise<CompatibleVehicle[]> {
  const { data } = await apiClient.get<{ items: CompatibleVehicle[] }>(
    `/compatibility/products/${productId}/vehicles`,
  );
  return data.items;
}

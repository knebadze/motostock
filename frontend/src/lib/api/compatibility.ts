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
  page?: number;
  pageSize?: number;
};

export type CompatibilityPage = {
  items: CompatibilityItem[];
  total: number;
  page: number;
  pageSize: number;
};

// Real server-side pagination (skip/take on the merged, sorted rows), not
// client-side slicing — mirrors error-logs.ts's getErrorLogs.
export async function listCompatibility(
  filters: ListCompatibilityFilters = {},
): Promise<CompatibilityPage> {
  const { data } = await apiClient.get<CompatibilityPage>("/compatibility", {
    params: filters,
  });
  return data;
}

export async function getCompatibleVehiclesForProduct(productId: number): Promise<CompatibleVehicle[]> {
  const { data } = await apiClient.get<{ items: CompatibleVehicle[] }>(
    `/compatibility/products/${productId}/vehicles`,
  );
  return data.items;
}

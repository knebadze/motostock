import { apiClient } from "./client";
import type { components } from "./generated/schema";
import type { ApiResponse } from "./generated-helpers";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type CompatibilityItemKind = "FITMENT" | "RULE_ALL" | "RULE_CATEGORY" | "RULE_SPEC";

export type CompatibleVehicle = Schemas["CompatibleVehicle"];

export type CompatibilityItem = Schemas["CompatibilityItem"];

export type ListCompatibilityFilters = {
  search?: string;
  categoryId?: number;
  kind?: "FITMENT" | "RULE";
  page?: number;
  pageSize?: number;
};

export type CompatibilityPage = ApiResponse<"/compatibility", "get">;

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

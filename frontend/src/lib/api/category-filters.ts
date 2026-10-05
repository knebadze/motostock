import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type CategoryFilterType = "PRICE" | "BRAND" | "ATTRIBUTE" | "MY_VEHICLE";

export type CategoryFilterAttributeOption = CategoryFilterAttribute["options"][number];

export type CategoryFilterAttribute = NonNullable<CategoryFilter["attribute"]>;

export type CategoryFilter = Schemas["CategoryFilterConfig"];

export type CategoryFilterInput = Schemas["CreateCategoryFilterInput"];

export async function listCategoryFilters(categoryId: number): Promise<CategoryFilter[]> {
  const { data } = await apiClient.get<{ items: CategoryFilter[] }>("/category-filters", {
    params: { categoryId },
  });
  return data.items;
}

export async function createCategoryFilter(input: CategoryFilterInput): Promise<CategoryFilter> {
  const { data } = await apiClient.post<{ item: CategoryFilter }>("/category-filters", input);
  return data.item;
}

export async function updateCategoryFilterSortOrder(
  id: number,
  sortOrder: number,
): Promise<CategoryFilter> {
  const { data } = await apiClient.patch<{ item: CategoryFilter }>(`/category-filters/${id}`, {
    sortOrder,
  });
  return data.item;
}

export async function deleteCategoryFilter(id: number): Promise<void> {
  await apiClient.delete(`/category-filters/${id}`);
}

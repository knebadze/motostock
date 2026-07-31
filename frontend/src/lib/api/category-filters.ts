import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { NamedRef } from "./vehicle-catalog";
import type { AttributeValueType } from "./attributes";

export type CategoryFilterType = "PRICE" | "BRAND" | "ATTRIBUTE";

export type CategoryFilterAttributeOption = { id: number; key: string; label: LocalizedString };

export type CategoryFilterAttribute = {
  id: number;
  name: LocalizedString;
  valueType: AttributeValueType;
  options: CategoryFilterAttributeOption[];
};

export type CategoryFilter = {
  id: number;
  categoryId: number;
  // The row's own defining category — differs from the browsed/managed
  // category when this filter was inherited from a parent category.
  category: NamedRef;
  filterType: CategoryFilterType;
  sortOrder: number;
  // Only present when filterType is "ATTRIBUTE".
  attribute: CategoryFilterAttribute | null;
};

export type CategoryFilterInput = {
  categoryId: number;
  filterType: CategoryFilterType;
  attributeId?: number | null;
  sortOrder?: number;
};

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

import { apiClient } from "./client";
import type { AdminFilterEntry } from "./admin-filters";

export type LocalizedString = {
  ka: string;
  en: string;
  ru: string;
};

export type Category = {
  id: number;
  name: LocalizedString;
  slug: string;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  sortOrder: number;
  // Storefront "only N left" urgency badge on this category's products —
  // admin-controllable since it's meaningless noise on categories where
  // stock is typically ~1 unit per item.
  lowStockBadgeEnabled: boolean;
  parentId: number | null;
  parent: { id: number; name: LocalizedString } | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoryInput = {
  name: LocalizedString;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  lowStockBadgeEnabled?: boolean;
};

export async function listCategories(adminFilters?: AdminFilterEntry[]): Promise<Category[]> {
  const { data } = await apiClient.get<{ categories: Category[] }>("/categories", {
    params: {
      adminFilters: adminFilters?.length ? JSON.stringify(adminFilters) : undefined,
    },
  });
  return data.categories;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await apiClient.post<{ category: Category }>("/categories", input);
  return data.category;
}

export async function updateCategory(
  id: number,
  input: Partial<CategoryInput>,
): Promise<Category> {
  const { data } = await apiClient.patch<{ category: Category }>(
    `/categories/${id}`,
    input,
  );
  return data.category;
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

export async function uploadCategoryImage(id: number, file: File): Promise<Category> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ category: Category }>(
    `/categories/${id}/image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.category;
}

export async function uploadCategoryBannerImage(id: number, file: File): Promise<Category> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ category: Category }>(
    `/categories/${id}/banner-image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.category;
}

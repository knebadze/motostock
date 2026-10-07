import { apiClient } from "./client";
import type { AdminFilterEntry } from "./admin-filters";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type LocalizedString = {
  ka: string;
  en: string;
  ru: string;
};

export type Category = Schemas["Category"];

export type CategoryInput = Schemas["CreateCategoryInput"];

// What the site header (Header.tsx) actually renders, with the name already resolved to the
// current locale — the guest layout passes this lean shape instead of full
// Category rows (three languages, banner, timestamps...) for every category
// on every page's serialized props.
export type HeaderCategory = Pick<Category, "id" | "parentId" | "slug" | "imageUrl"> & { name: string };

export function toHeaderCategories(categories: Category[], locale: "ka" | "en" | "ru"): HeaderCategory[] {
  return categories.map(({ id, parentId, slug, imageUrl, name }) => ({ id, parentId, slug, imageUrl, name: name[locale] }));
}

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

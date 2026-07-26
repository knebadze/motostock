import { apiClient } from "./client";

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
  parentId: number | null;
  parent: { id: number; name: LocalizedString } | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoryInput = {
  name: LocalizedString;
  slug: string;
  parentId: number | null;
};

export async function listCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<{ categories: Category[] }>("/categories");
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

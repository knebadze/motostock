import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type Model = {
  id: number;
  brandId: number;
  brand: { id: number; name: string; slug: string };
  categoryId: number;
  category: { id: number; name: LocalizedString; slug: string };
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelInput = {
  brandId: number;
  categoryId: number;
  name: string;
  slug: string;
};

export async function listModels(brandId?: number): Promise<Model[]> {
  const { data } = await apiClient.get<{ models: Model[] }>("/models", {
    params: brandId ? { brandId } : undefined,
  });
  return data.models;
}

export async function createModel(input: ModelInput): Promise<Model> {
  const { data } = await apiClient.post<{ model: Model }>("/models", input);
  return data.model;
}

export async function updateModel(id: number, input: Partial<ModelInput>): Promise<Model> {
  const { data } = await apiClient.patch<{ model: Model }>(`/models/${id}`, input);
  return data.model;
}

export async function deleteModel(id: number): Promise<void> {
  await apiClient.delete(`/models/${id}`);
}

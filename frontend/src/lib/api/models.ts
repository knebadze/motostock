import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type Model = Schemas["Model"];

export type ModelInput = Schemas["CreateModelInput"];

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

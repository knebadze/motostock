import { apiClient } from "./client";
import type { components } from "./generated/schema";
import type { AdminFilterEntry } from "./admin-filters";

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

export type ModelPage = { items: Model[]; total: number; page: number; pageSize: number };

// Real server-side pagination (skip/take) — only used by the admin models
// list screen, which always sends page/pageSize; every other caller
// (listModels above, PromoCodeFormModal's brandId-only lookup) keeps getting
// the full, unbounded list.
export async function listModelsPage(
  adminFilters: AdminFilterEntry[] = [],
  page = 1,
  pageSize = 20,
): Promise<ModelPage> {
  const { data } = await apiClient.get<ModelPage>("/models", {
    params: {
      adminFilters: adminFilters.length ? JSON.stringify(adminFilters) : undefined,
      page,
      pageSize,
    },
  });
  return data;
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

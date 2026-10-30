import { apiClient } from "./client";
import type { components } from "./generated/schema";
import type { AdminFilterEntry } from "./admin-filters";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type Brand = Schemas["Brand"];

export type BrandInput = Schemas["CreateBrandInput"];

export async function listBrands(): Promise<Brand[]> {
  const { data } = await apiClient.get<{ brands: Brand[] }>("/brands");
  return data.brands;
}

export type BrandPage = { items: Brand[]; total: number; page: number; pageSize: number };

// Real server-side pagination (skip/take) — only used by the admin brands
// list screen, which always sends page/pageSize; every other caller (logo
// pickers, ModelFormModal's brand select, filter options, ...) keeps using
// listBrands above and gets the full, unbounded list.
export async function listBrandsPage(
  adminFilters: AdminFilterEntry[] = [],
  page = 1,
  pageSize = 20,
): Promise<BrandPage> {
  const { data } = await apiClient.get<BrandPage>("/brands", {
    params: {
      adminFilters: adminFilters.length ? JSON.stringify(adminFilters) : undefined,
      page,
      pageSize,
    },
  });
  return data;
}

export async function createBrand(input: BrandInput): Promise<Brand> {
  const { data } = await apiClient.post<{ brand: Brand }>("/brands", input);
  return data.brand;
}

export async function updateBrand(id: number, input: Partial<BrandInput>): Promise<Brand> {
  const { data } = await apiClient.patch<{ brand: Brand }>(`/brands/${id}`, input);
  return data.brand;
}

export async function deleteBrand(id: number): Promise<void> {
  await apiClient.delete(`/brands/${id}`);
}

export async function uploadBrandLogo(id: number, file: File): Promise<Brand> {
  const formData = new FormData();
  formData.append("logo", file);

  const { data } = await apiClient.post<{ brand: Brand }>(`/brands/${id}/logo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.brand;
}

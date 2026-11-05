import { apiClient } from "./client";
import type { components } from "./generated/schema";
import type { AdminFilterEntry } from "./admin-filters";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type ProductBrand = Schemas["ProductBrand"];

export type ProductBrandInput = Schemas["CreateProductBrandInput"];

export async function listProductBrands(categoryId?: number): Promise<ProductBrand[]> {
  const { data } = await apiClient.get<{ items: ProductBrand[] }>("/product-brands", {
    params: categoryId ? { categoryId } : undefined,
  });
  return data.items;
}

export type ProductBrandPage = { items: ProductBrand[]; total: number; page: number; pageSize: number };

// Real server-side pagination (skip/take) — only used by the admin
// product-brands list screen, which always sends page/pageSize; every
// other caller (product form's brand dropdown, promo code forms, ...) keeps
// using listProductBrands above and gets the full, unbounded list.
export async function listProductBrandsPage(
  adminFilters: AdminFilterEntry[] = [],
  page = 1,
  pageSize = 20,
): Promise<ProductBrandPage> {
  const { data } = await apiClient.get<ProductBrandPage>("/product-brands", {
    params: {
      adminFilters: adminFilters.length ? JSON.stringify(adminFilters) : undefined,
      page,
      pageSize,
    },
  });
  return data;
}

export async function createProductBrand(input: ProductBrandInput): Promise<ProductBrand> {
  const { data } = await apiClient.post<{ item: ProductBrand }>("/product-brands", input);
  return data.item;
}

export async function updateProductBrand(
  id: number,
  input: Partial<ProductBrandInput>,
): Promise<ProductBrand> {
  const { data } = await apiClient.patch<{ item: ProductBrand }>(`/product-brands/${id}`, input);
  return data.item;
}

export async function deleteProductBrand(id: number): Promise<void> {
  await apiClient.delete(`/product-brands/${id}`);
}

export async function uploadProductBrandLogo(id: number, file: File): Promise<ProductBrand> {
  const formData = new FormData();
  formData.append("logo", file);

  const { data } = await apiClient.post<{ item: ProductBrand }>(
    `/product-brands/${id}/logo`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.item;
}

import { apiClient } from "./client";
import type { components } from "./generated/schema";

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

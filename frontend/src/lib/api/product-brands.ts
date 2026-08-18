import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type ProductBrand = {
  id: number;
  category: { id: number; name: LocalizedString; slug: string };
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductBrandInput = {
  categoryId: number;
  name: string;
  slug: string;
};

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

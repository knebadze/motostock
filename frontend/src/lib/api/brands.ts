import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type Brand = {
  id: number;
  name: LocalizedString;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BrandInput = {
  name: LocalizedString;
  slug: string;
};

export async function listBrands(): Promise<Brand[]> {
  const { data } = await apiClient.get<{ brands: Brand[] }>("/brands");
  return data.brands;
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

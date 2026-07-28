import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { NamedRef } from "./vehicle-catalog";
import type { AttributeValueType } from "./attributes";

export type ProductAttributeValue = {
  attributeId: number;
  attributeName: LocalizedString;
  valueType: AttributeValueType;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  option: { id: number; key: string; label: LocalizedString } | null;
};

export type ProductAttributeValueInput = {
  attributeId: number;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  optionId?: number | null;
};

export type Product = {
  id: number;
  category: NamedRef;
  productBrand: NamedRef | null;
  name: LocalizedString;
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  imageUrl: string | null;
  attributeValues: ProductAttributeValue[];
  variantCount: number;
  minPrice: number | null;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  categoryId: number;
  productBrandId?: number | null;
  name: LocalizedString;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
  attributeValues?: ProductAttributeValueInput[];
};

export async function listProducts(categoryId?: number): Promise<Product[]> {
  const { data } = await apiClient.get<{ items: Product[] }>("/products", {
    params: categoryId ? { categoryId } : undefined,
  });
  return data.items;
}

export async function getProduct(id: number): Promise<Product> {
  const { data } = await apiClient.get<{ item: Product }>(`/products/${id}`);
  return data.item;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await apiClient.post<{ item: Product }>("/products", input);
  return data.item;
}

export async function updateProduct(id: number, input: Partial<ProductInput>): Promise<Product> {
  const { data } = await apiClient.patch<{ item: Product }>(`/products/${id}`, input);
  return data.item;
}

export async function deleteProduct(id: number): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function uploadProductImage(id: number, file: File): Promise<Product> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ item: Product }>(`/products/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.item;
}

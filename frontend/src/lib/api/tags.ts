import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

// Buy-together tags (admin-only; see backend modules/tags).
export type Tag = Schemas["Tag"];
export type TagInput = Schemas["CreateTagInput"];
export type ProductTagRef = Schemas["ProductTagRef"];
export type TagProduct = Schemas["TagProduct"];

export async function listTags(): Promise<Tag[]> {
  const { data } = await apiClient.get<{ items: Tag[] }>("/tags");
  return data.items;
}

export async function createTag(input: TagInput): Promise<Tag> {
  const { data } = await apiClient.post<{ item: Tag }>("/tags", input);
  return data.item;
}

export async function updateTag(id: number, input: Partial<TagInput>): Promise<Tag> {
  const { data } = await apiClient.patch<{ item: Tag }>(`/tags/${id}`, input);
  return data.item;
}

export async function deleteTag(id: number): Promise<void> {
  await apiClient.delete(`/tags/${id}`);
}

export async function listTagProducts(id: number): Promise<TagProduct[]> {
  const { data } = await apiClient.get<{ items: TagProduct[] }>(`/tags/${id}/products`);
  return data.items;
}

export type BulkTagProductsResult = Schemas["BulkTagProductsResult"];

// Bulk assign/remove (admin products list selection).
export async function addTagToProducts(tagId: number, productIds: number[]): Promise<BulkTagProductsResult> {
  const { data } = await apiClient.post<BulkTagProductsResult>(`/tags/${tagId}/products/assign`, { productIds });
  return data;
}

export async function removeTagFromProducts(tagId: number, productIds: number[]): Promise<BulkTagProductsResult> {
  const { data } = await apiClient.post<BulkTagProductsResult>(`/tags/${tagId}/products/unassign`, { productIds });
  return data;
}

// Replaces the product's whole tag set.
export async function setProductTags(productId: number, tagIds: number[]): Promise<ProductTagRef[]> {
  const { data } = await apiClient.put<{ items: ProductTagRef[] }>(`/products/${productId}/tags`, { tagIds });
  return data.items;
}

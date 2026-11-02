import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type AttributeValueType = "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT";

export type Attribute = Schemas["Attribute"];

export type AttributeInput = Schemas["CreateAttributeInput"];

// includeDescendants: also the subcategories' attributes (admin shop-filter
// picker only).
export async function listAttributes(categoryId?: number, includeDescendants = false): Promise<Attribute[]> {
  const { data } = await apiClient.get<{ items: Attribute[] }>("/attributes", {
    params: categoryId ? { categoryId, ...(includeDescendants ? { includeDescendants: true } : {}) } : undefined,
  });
  return data.items;
}

export async function createAttribute(input: AttributeInput): Promise<Attribute> {
  const { data } = await apiClient.post<{ item: Attribute }>("/attributes", input);
  return data.item;
}

export async function updateAttribute(
  id: number,
  input: Partial<AttributeInput>,
): Promise<Attribute> {
  const { data } = await apiClient.patch<{ item: Attribute }>(`/attributes/${id}`, input);
  return data.item;
}

export async function deleteAttribute(id: number): Promise<void> {
  await apiClient.delete(`/attributes/${id}`);
}

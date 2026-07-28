import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type AttributeValueType = "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT";

export type Attribute = {
  id: number;
  category: { id: number; name: LocalizedString; slug: string };
  name: LocalizedString;
  valueType: AttributeValueType;
  required: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AttributeInput = {
  categoryId: number;
  name: LocalizedString;
  valueType: AttributeValueType;
  required?: boolean;
};

export async function listAttributes(categoryId?: number): Promise<Attribute[]> {
  const { data } = await apiClient.get<{ items: Attribute[] }>("/attributes", {
    params: categoryId ? { categoryId } : undefined,
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

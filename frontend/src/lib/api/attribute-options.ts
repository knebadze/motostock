import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type AttributeOption = Schemas["AttributeOption"];

export type AttributeOptionInput = Schemas["CreateAttributeOptionInput"];

export async function listAttributeOptions(attributeId: number): Promise<AttributeOption[]> {
  const { data } = await apiClient.get<{ items: AttributeOption[] }>(
    `/attributes/${attributeId}/options`,
  );
  return data.items;
}

export async function createAttributeOption(
  attributeId: number,
  input: AttributeOptionInput,
): Promise<AttributeOption> {
  const { data } = await apiClient.post<{ item: AttributeOption }>(
    `/attributes/${attributeId}/options`,
    input,
  );
  return data.item;
}

export async function updateAttributeOption(
  attributeId: number,
  id: number,
  input: Partial<AttributeOptionInput>,
): Promise<AttributeOption> {
  const { data } = await apiClient.patch<{ item: AttributeOption }>(
    `/attributes/${attributeId}/options/${id}`,
    input,
  );
  return data.item;
}

export async function deleteAttributeOption(attributeId: number, id: number): Promise<void> {
  await apiClient.delete(`/attributes/${attributeId}/options/${id}`);
}

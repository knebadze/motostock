import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type AttributeOption = {
  id: number;
  attributeId: number;
  key: string;
  label: LocalizedString;
};

export type AttributeOptionInput = {
  key: string;
  label: LocalizedString;
};

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

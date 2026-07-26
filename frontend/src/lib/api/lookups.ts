import { apiClient } from "./client";
import type { LookupTypeSlug } from "@/config/lookup-types";

export type LookupItem = {
  id: number;
  key: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
};

export type LookupItemInput = {
  key: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
};

export async function listLookupItems(type: LookupTypeSlug): Promise<LookupItem[]> {
  const { data } = await apiClient.get<{ items: LookupItem[] }>(`/lookups/${type}`);
  return data.items;
}

export async function createLookupItem(
  type: LookupTypeSlug,
  input: LookupItemInput,
): Promise<LookupItem> {
  const { data } = await apiClient.post<{ item: LookupItem }>(`/lookups/${type}`, input);
  return data.item;
}

export async function updateLookupItem(
  type: LookupTypeSlug,
  id: number,
  input: Partial<LookupItemInput>,
): Promise<LookupItem> {
  const { data } = await apiClient.patch<{ item: LookupItem }>(
    `/lookups/${type}/${id}`,
    input,
  );
  return data.item;
}

export async function deleteLookupItem(type: LookupTypeSlug, id: number): Promise<void> {
  await apiClient.delete(`/lookups/${type}/${id}`);
}

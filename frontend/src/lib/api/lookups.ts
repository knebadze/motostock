import { apiClient } from "./client";
import type { LookupTypeSlug } from "@/config/lookup-types";

export type LookupItem = {
  id: number;
  key: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
};

// Shared field-picker for this flat nameKa/nameEn/nameRu shape (unlike a
// LocalizedString's nested {ka,en,ru}) — used wherever a LookupItem-shaped
// value (City, Size, Color, ...) needs its name in the current locale.
// Previously reimplemented ad hoc per call site (e.g. a local cityNameKey
// helper, or a hardcoded `.nameKa` that ignored locale entirely), which is
// how Footer.tsx/contact/page.tsx ended up always showing the city name in
// Georgian regardless of the active locale.
export function localizedLookupName(
  item: Pick<LookupItem, "nameKa" | "nameEn" | "nameRu">,
  locale: string,
): string {
  if (locale === "ka") return item.nameKa;
  if (locale === "ru") return item.nameRu;
  return item.nameEn;
}

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

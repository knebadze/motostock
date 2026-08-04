import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type Unit = {
  id: number;
  name: LocalizedString;
  abbreviation: LocalizedString;
  createdAt: string;
  updatedAt: string;
};

export type UnitInput = {
  name: LocalizedString;
  abbreviation: LocalizedString;
};

export async function listUnits(): Promise<Unit[]> {
  const { data } = await apiClient.get<{ items: Unit[] }>("/units");
  return data.items;
}

export async function createUnit(input: UnitInput): Promise<Unit> {
  const { data } = await apiClient.post<{ item: Unit }>("/units", input);
  return data.item;
}

export async function updateUnit(id: number, input: Partial<UnitInput>): Promise<Unit> {
  const { data } = await apiClient.patch<{ item: Unit }>(`/units/${id}`, input);
  return data.item;
}

export async function deleteUnit(id: number): Promise<void> {
  await apiClient.delete(`/units/${id}`);
}

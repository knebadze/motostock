import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type Unit = Schemas["Unit"];

export type UnitInput = Schemas["CreateUnitInput"];

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

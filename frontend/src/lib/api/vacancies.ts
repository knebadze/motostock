import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type Vacancy = Schemas["Vacancy"];

export type VacancyInput = Schemas["CreateVacancyInput"];

export async function listVacancies(): Promise<Vacancy[]> {
  const { data } = await apiClient.get<{ items: Vacancy[] }>("/vacancies");
  return data.items;
}

export async function createVacancy(input: VacancyInput): Promise<Vacancy> {
  const { data } = await apiClient.post<{ item: Vacancy }>("/vacancies", input);
  return data.item;
}

export async function updateVacancy(id: number, input: Partial<VacancyInput>): Promise<Vacancy> {
  const { data } = await apiClient.patch<{ item: Vacancy }>(`/vacancies/${id}`, input);
  return data.item;
}

export async function deleteVacancy(id: number): Promise<void> {
  await apiClient.delete(`/vacancies/${id}`);
}

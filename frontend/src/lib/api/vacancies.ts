import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type Vacancy = {
  id: number;
  title: LocalizedString;
  description: LocalizedString;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VacancyInput = {
  title: LocalizedString;
  description: LocalizedString;
  slug: string;
  isActive?: boolean;
};

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

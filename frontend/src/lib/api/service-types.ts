import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type ServiceType = {
  id: number;
  name: LocalizedString;
  hasPositionOption: boolean;
  hasFilterOption: boolean;
  // Pre-fills a new ServiceRecord's price when this template is picked —
  // a starting point, still editable per record.
  defaultPrice: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceTypeInput = {
  name: LocalizedString;
  hasPositionOption?: boolean;
  hasFilterOption?: boolean;
  defaultPrice?: number | null;
  isActive?: boolean;
};

export async function listServiceTypes(): Promise<ServiceType[]> {
  const { data } = await apiClient.get<{ items: ServiceType[] }>("/service-types");
  return data.items;
}

export async function createServiceType(input: ServiceTypeInput): Promise<ServiceType> {
  const { data } = await apiClient.post<{ item: ServiceType }>("/service-types", input);
  return data.item;
}

export async function updateServiceType(
  id: number,
  input: Partial<ServiceTypeInput>,
): Promise<ServiceType> {
  const { data } = await apiClient.patch<{ item: ServiceType }>(`/service-types/${id}`, input);
  return data.item;
}

export async function reorderServiceTypes(ids: number[]): Promise<ServiceType[]> {
  const { data } = await apiClient.put<{ items: ServiceType[] }>("/service-types/order", { ids });
  return data.items;
}

export async function deleteServiceType(id: number): Promise<void> {
  await apiClient.delete(`/service-types/${id}`);
}

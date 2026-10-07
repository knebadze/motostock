import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type ServiceType = Schemas["ServiceType"];
// The storefront /service page's shape — names only.
export type PublicServiceType = Schemas["PublicServiceType"];

export type ServiceTypeInput = Schemas["CreateServiceTypeInput"];

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

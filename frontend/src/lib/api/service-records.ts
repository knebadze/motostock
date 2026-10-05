import { apiClient } from "./client";
import type { components } from "./generated/schema";
import type { ApiResponse } from "./generated-helpers";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type ServicePosition = "FRONT" | "REAR" | "BOTH";

export type ServiceRecord = Schemas["ServiceRecord"];

// Either serviceTypeId or customServiceName — never both, never neither
// (see the backend's create schema .refine() and DB CHECK constraint).
export type CreateServiceRecordInput = Schemas["CreateServiceRecordInput"];

export type UpdateServiceRecordInput = Schemas["UpdateServiceRecordInput"];

export async function listServiceRecordsForVehicle(garageVehicleId: number): Promise<ServiceRecord[]> {
  const { data } = await apiClient.get<{ items: ServiceRecord[] }>("/service-records", {
    params: { garageVehicleId },
  });
  return data.items;
}

// Workshop "სერვისის ისტორია" screen's admin-wide overview table — every
// customer's recent services at once, not scoped to one already-picked
// vehicle (see the plain listServiceRecordsForVehicle above).
export type AdminServiceRecord = ServiceRecordsAdminPage["items"][number];

export type ListServiceRecordsAdminFilters = {
  search?: string;
  serviceTypeId?: number;
  mechanicId?: number;
  performedFrom?: string;
  performedTo?: string;
  page?: number;
  pageSize?: number;
};

export type ServiceRecordsAdminPage = ApiResponse<"/service-records/admin", "get">;

export async function listServiceRecordsAdmin(
  filters: ListServiceRecordsAdminFilters = {},
): Promise<ServiceRecordsAdminPage> {
  const { data } = await apiClient.get<ServiceRecordsAdminPage>("/service-records/admin", {
    params: filters,
  });
  return data;
}

export async function createServiceRecord(input: CreateServiceRecordInput): Promise<ServiceRecord> {
  const { data } = await apiClient.post<{ item: ServiceRecord }>("/service-records", input);
  return data.item;
}

export async function updateServiceRecord(
  id: number,
  input: UpdateServiceRecordInput,
): Promise<ServiceRecord> {
  const { data } = await apiClient.patch<{ item: ServiceRecord }>(`/service-records/${id}`, input);
  return data.item;
}

export async function deleteServiceRecord(id: number): Promise<void> {
  await apiClient.delete(`/service-records/${id}`);
}

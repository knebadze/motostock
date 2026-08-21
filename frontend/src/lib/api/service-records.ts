import { apiClient } from "./client";
import type { LocalizedString } from "./categories";

export type ServicePosition = "FRONT" | "REAR" | "BOTH";

export type ServiceRecord = {
  id: number;
  garageVehicleId: number;
  serviceTypeId: number | null;
  serviceTypeName: LocalizedString | null;
  customServiceName: string | null;
  mileageKm: number;
  performedAt: string;
  position: ServicePosition | null;
  filterChanged: boolean | null;
  notes: string | null;
  recordedByUserId: number | null;
  createdAt: string;
  updatedAt: string;
};

// Either serviceTypeId or customServiceName — never both, never neither
// (see the backend's create schema .refine() and DB CHECK constraint).
export type CreateServiceRecordInput = {
  garageVehicleId: number;
  serviceTypeId?: number;
  customServiceName?: string;
  mileageKm: number;
  performedAt: string;
  position?: ServicePosition;
  filterChanged?: boolean;
  notes?: string;
};

export type UpdateServiceRecordInput = {
  mileageKm?: number;
  performedAt?: string;
  position?: ServicePosition | null;
  filterChanged?: boolean | null;
  notes?: string | null;
};

export async function listServiceRecordsForVehicle(garageVehicleId: number): Promise<ServiceRecord[]> {
  const { data } = await apiClient.get<{ items: ServiceRecord[] }>("/service-records", {
    params: { garageVehicleId },
  });
  return data.items;
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

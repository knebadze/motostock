import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { LookupItem } from "./lookups";

export type NamedRef = {
  id: number;
  name: LocalizedString;
  slug: string;
};

export type VehicleCatalogEntry = {
  id: number;
  category: NamedRef;
  brand: NamedRef;
  model: NamedRef;
  variant: string;
  yearFrom: number | null;
  yearTo: number | null;
  engineVolumeCc: number | null;
  enginePowerHp: number | null;
  cylinderCount: number | null;
  gearCount: number | null;
  seatCount: number | null;
  fuelType: LookupItem | null;
  transmissionType: LookupItem | null;
  coolingType: LookupItem | null;
  finalDriveType: LookupItem | null;
  driveType: LookupItem | null;
  startType: LookupItem | null;
  powertrainType: LookupItem | null;
  motorPowerWatt: number | null;
  batteryCapacityWh: number | null;
  rangeKm: number | null;
  chargingTimeMinutes: number | null;
  hasLockingDifferential: boolean | null;
  imageUrl: string | null;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleCatalogInput = {
  categoryId: number;
  brandId: number;
  modelId: number;
  variant?: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  engineVolumeCc?: number | null;
  enginePowerHp?: number | null;
  cylinderCount?: number | null;
  gearCount?: number | null;
  seatCount?: number | null;
  fuelTypeId?: number | null;
  transmissionTypeId?: number | null;
  coolingTypeId?: number | null;
  finalDriveTypeId?: number | null;
  driveTypeId?: number | null;
  startTypeId?: number | null;
  powertrainTypeId?: number | null;
  motorPowerWatt?: number | null;
  batteryCapacityWh?: number | null;
  rangeKm?: number | null;
  chargingTimeMinutes?: number | null;
  hasLockingDifferential?: boolean | null;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
};

export async function listVehicleCatalog(): Promise<VehicleCatalogEntry[]> {
  const { data } = await apiClient.get<{ items: VehicleCatalogEntry[] }>("/vehicle-catalog");
  return data.items;
}

export async function createVehicleCatalogEntry(
  input: VehicleCatalogInput,
): Promise<VehicleCatalogEntry> {
  const { data } = await apiClient.post<{ item: VehicleCatalogEntry }>(
    "/vehicle-catalog",
    input,
  );
  return data.item;
}

export async function updateVehicleCatalogEntry(
  id: number,
  input: Partial<VehicleCatalogInput>,
): Promise<VehicleCatalogEntry> {
  const { data } = await apiClient.patch<{ item: VehicleCatalogEntry }>(
    `/vehicle-catalog/${id}`,
    input,
  );
  return data.item;
}

export async function deleteVehicleCatalogEntry(id: number): Promise<void> {
  await apiClient.delete(`/vehicle-catalog/${id}`);
}

export async function uploadVehicleCatalogImage(
  id: number,
  file: File,
): Promise<VehicleCatalogEntry> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ item: VehicleCatalogEntry }>(
    `/vehicle-catalog/${id}/image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.item;
}

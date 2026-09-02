import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { LookupItem } from "./lookups";
import type { AdminFilterEntry } from "./admin-filters";

export type NamedRef = {
  id: number;
  name: LocalizedString;
  slug: string;
};

// Brand/Model names are locale-invariant (not per-language translated), so
// they're plain strings unlike Category/ProductBrand's NamedRef.
export type BrandModelRef = {
  id: number;
  name: string;
  slug: string;
};

export type VehicleCatalogEntry = {
  id: number;
  category: NamedRef;
  brand: BrandModelRef;
  model: BrandModelRef;
  submittedBy: { id: number; name: string } | null;
  variant: string;
  yearFrom: number | null;
  yearTo: number | null;
  engineVolumeCc: number | null;
  enginePowerHp: number | null;
  cylinderCount: number | null;
  gearCount: number | null;
  seatCount: number | null;
  weightKg: number | null;
  seatHeightMm: number | null;
  fuelTankLiters: number | null;
  topSpeedKmh: number | null;
  hasAbs: boolean | null;
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
  popularity: number;
  createdAt: string;
  updatedAt: string;
};

export type VehicleCatalogInput = {
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
  weightKg?: number | null;
  seatHeightMm?: number | null;
  fuelTankLiters?: number | null;
  topSpeedKmh?: number | null;
  hasAbs?: boolean | null;
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

export type SubmitVehicleCatalogInput = {
  brandId: number;
  modelId: number;
  variant?: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  year: number;
  vin?: string | null;
  engineVolumeCc?: number | null;
  enginePowerHp?: number | null;
  fuelTypeId?: number | null;
  transmissionTypeId?: number | null;
};

export type GarageVehicle = {
  id: number;
  year: number;
  vin: string | null;
  // The customer's own photo of their actual vehicle — distinct from
  // vehicleCatalog.imageUrl, which is a shared stock photo for the model.
  imageUrl: string | null;
  vehicleCatalog: VehicleCatalogEntry;
  createdAt: string;
  updatedAt: string;
};

export async function submitVehicleCatalogEntry(
  input: SubmitVehicleCatalogInput,
): Promise<GarageVehicle> {
  const { data } = await apiClient.post<{ item: GarageVehicle }>(
    "/vehicle-catalog/submit",
    input,
  );
  return data.item;
}

export type VehicleCatalogPage = {
  items: VehicleCatalogEntry[];
  total: number;
  page: number;
  pageSize: number;
};

// Real server-side pagination (skip/take), unlike most other admin lists —
// only used by the admin catalog list screen, which always sends page and
// pageSize; the many full-list consumers of GET /vehicle-catalog (fitment
// pickers, garage, homepage, ...) go through getVehicleCatalogFromServer
// instead and never send these, so they keep getting every row.
export async function listVehicleCatalog(
  adminFilters: AdminFilterEntry[] = [],
  page = 1,
  pageSize = 20,
): Promise<VehicleCatalogPage> {
  const { data } = await apiClient.get<VehicleCatalogPage>("/vehicle-catalog", {
    params: {
      adminFilters: adminFilters.length ? JSON.stringify(adminFilters) : undefined,
      page,
      pageSize,
    },
  });
  return data;
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

export type BulkImportRowResult = {
  row: number;
  status: "created" | "error";
  message: string | null;
  id: number | null;
};

export type BulkImportVehicleCatalogResult = {
  totalRows: number;
  createdCount: number;
  errorCount: number;
  results: BulkImportRowResult[];
};

export async function downloadVehicleCatalogTemplate(): Promise<void> {
  const { data } = await apiClient.get<Blob>("/vehicle-catalog/bulk-import/template", {
    responseType: "blob",
  });

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vehicle-catalog-template.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function bulkImportVehicleCatalog(
  file: File,
): Promise<BulkImportVehicleCatalogResult> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<BulkImportVehicleCatalogResult>(
    "/vehicle-catalog/bulk-import",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
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

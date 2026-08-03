import { apiClient } from "./client";
import type { NamedRef } from "./vehicle-catalog";
import type { LookupItem } from "./lookups";
import type { VehicleListingDiscount } from "./vehicle-listing-discounts";
import type { VehicleListingImage } from "./vehicle-listing-images";
import type { VehicleSpecField } from "./vehicle-category-filters";
import type { AdminFilterEntry } from "./admin-filters";

export type VehicleListing = {
  id: number;
  vehicleCatalog: {
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
    descriptionKa: string | null;
    descriptionEn: string | null;
    descriptionRu: string | null;
    imageUrl: string | null;
  };
  condition: LookupItem;
  status: LookupItem;
  color: LookupItem;
  year: number;
  isActive: boolean;
  price: number;
  stockQuantity: number;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  images: VehicleListingImage[];
  discounts: VehicleListingDiscount[];
  activeDiscount: VehicleListingDiscount | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleListingInput = {
  vehicleCatalogId: number;
  conditionId: number;
  statusId: number;
  colorId: number;
  year: number;
  isActive?: boolean;
  price: number;
  stockQuantity?: number;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
};

export type VehicleSpecFilters = {
  lookupFilters?: { field: VehicleSpecField; ids: number[] }[];
  numberRanges?: { field: VehicleSpecField; min?: number; max?: number }[];
  booleanFields?: VehicleSpecField[];
};

export type VehicleListingFilters = {
  categoryId?: number;
  search?: string;
  brandIds?: number[];
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  specFilters?: VehicleSpecFilters;
  adminFilters?: AdminFilterEntry[];
};

function isEmptySpecFilters(filters: VehicleSpecFilters): boolean {
  return (
    !filters.lookupFilters?.length &&
    !filters.numberRanges?.length &&
    !filters.booleanFields?.length
  );
}

export async function listVehicleListings(
  filters: VehicleListingFilters = {},
): Promise<VehicleListing[]> {
  const { data } = await apiClient.get<{ items: VehicleListing[] }>("/vehicle-listings", {
    params: {
      categoryId: filters.categoryId,
      search: filters.search || undefined,
      brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      yearMin: filters.yearMin,
      yearMax: filters.yearMax,
      specFilters:
        filters.specFilters && !isEmptySpecFilters(filters.specFilters)
          ? JSON.stringify(filters.specFilters)
          : undefined,
      adminFilters: filters.adminFilters?.length ? JSON.stringify(filters.adminFilters) : undefined,
    },
  });
  return data.items;
}

export async function getVehicleListing(id: number): Promise<VehicleListing> {
  const { data } = await apiClient.get<{ item: VehicleListing }>(`/vehicle-listings/${id}`);
  return data.item;
}

export async function createVehicleListing(
  input: VehicleListingInput,
): Promise<VehicleListing> {
  const { data } = await apiClient.post<{ item: VehicleListing }>("/vehicle-listings", input);
  return data.item;
}

export async function updateVehicleListing(
  id: number,
  input: Partial<VehicleListingInput>,
): Promise<VehicleListing> {
  const { data } = await apiClient.patch<{ item: VehicleListing }>(
    `/vehicle-listings/${id}`,
    input,
  );
  return data.item;
}

export async function deleteVehicleListing(id: number): Promise<void> {
  await apiClient.delete(`/vehicle-listings/${id}`);
}

import { apiClient } from "./client";
import type { BrandModelRef, NamedRef } from "./vehicle-catalog";
import type { LookupItem } from "./lookups";
import type { VehicleListingDiscount } from "./vehicle-listing-discounts";
import type { VehicleListingImage } from "./vehicle-listing-images";
import type { VehicleSpecField } from "./vehicle-category-filters";
import type { AdminFilterEntry } from "./admin-filters";

export type WarrantyUnit = "YEAR" | "MONTH";

export type VehicleListing = {
  id: number;
  vehicleCatalog: {
    id: number;
    category: NamedRef;
    brand: BrandModelRef;
    model: BrandModelRef;
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
  mileageKm: number | null;
  warrantyValue: number | null;
  warrantyUnit: WarrantyUnit | null;
  isActive: boolean;
  price: number;
  stockQuantity: number;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  images: VehicleListingImage[];
  discounts: VehicleListingDiscount[];
  // Narrower than a full VehicleListingDiscount — may be derived from a
  // rule-based bulk discount (no real DB row of its own). Only
  // discountPrice is ever read; the crossed-out original price always comes
  // from the listing's own `price`.
  activeDiscount: { discountPrice: number } | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

export type VehicleListingInput = {
  vehicleCatalogId: number;
  conditionId: number;
  statusId: number;
  colorId: number;
  year: number;
  mileageKm?: number | null;
  warrantyValue?: number | null;
  warrantyUnit?: WarrantyUnit | null;
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
  onSale?: boolean;
  limit?: number;
  specFilters?: VehicleSpecFilters;
  adminFilters?: AdminFilterEntry[];
  // Admin-list server-side pagination (see listVehicleListingsAdmin) —
  // meaningless without adminFilters, ignored by the backend otherwise.
  page?: number;
  pageSize?: number;
};

function isEmptySpecFilters(filters: VehicleSpecFilters): boolean {
  return (
    !filters.lookupFilters?.length &&
    !filters.numberRanges?.length &&
    !filters.booleanFields?.length
  );
}

type VehicleListingListResponse = {
  items: VehicleListing[];
  total: number;
  page: number;
  pageSize: number;
};

async function fetchVehicleListingsList(
  filters: VehicleListingFilters,
): Promise<VehicleListingListResponse> {
  const { data } = await apiClient.get<VehicleListingListResponse>("/vehicle-listings", {
    params: {
      categoryId: filters.categoryId,
      search: filters.search || undefined,
      brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      yearMin: filters.yearMin,
      yearMax: filters.yearMax,
      onSale: filters.onSale || undefined,
      limit: filters.limit,
      specFilters:
        filters.specFilters && !isEmptySpecFilters(filters.specFilters)
          ? JSON.stringify(filters.specFilters)
          : undefined,
      // Must distinguish "not an admin call" (key omitted — storefront
      // callers never pass this) from "admin call, no filters picked" (an
      // empty array) — see products.ts's listProducts for the full
      // reasoning (identical signal, same backend lean-projection pattern
      // in vehicle-listing.service.ts's listVehicleListings).
      adminFilters: filters.adminFilters !== undefined ? JSON.stringify(filters.adminFilters) : undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  });
  return data;
}

export async function listVehicleListings(
  filters: VehicleListingFilters = {},
): Promise<VehicleListing[]> {
  const { items } = await fetchVehicleListingsList(filters);
  return items;
}

// Admin-list variant of listVehicleListings — same endpoint/filters, but
// returns the full server-pagination envelope (total/page/pageSize) instead
// of a bare array. Only VehicleListingsManager.tsx should call this; every
// storefront caller keeps using listVehicleListings above, unaffected.
export async function listVehicleListingsAdmin(
  filters: VehicleListingFilters = {},
): Promise<VehicleListingListResponse> {
  return fetchVehicleListingsList(filters);
}

export async function listPopularVehicleListings(limit?: number): Promise<VehicleListing[]> {
  const { data } = await apiClient.get<{ items: VehicleListing[] }>("/vehicle-listings/popular", {
    params: { limit },
  });
  return data.items;
}

export async function getVehicleListing(id: number): Promise<VehicleListing> {
  const { data } = await apiClient.get<{ item: VehicleListing }>(`/vehicle-listings/${id}`);
  return data.item;
}

export type VehicleListingSaleOrder = {
  orderId: number;
  orderCode: string;
  createdAt: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  lineTotal: number;
  status: string;
};

export type VehicleListingSalesSummary = {
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
  recentOrders: VehicleListingSaleOrder[];
};

// Admin-only detail — same as VehicleListing plus sales history, returned
// by the admin "full view" endpoint (see getVehicleListingDetailAdmin).
export type VehicleListingDetailAdmin = VehicleListing & {
  sales: VehicleListingSalesSummary;
};

export async function getVehicleListingDetailAdmin(id: number): Promise<VehicleListingDetailAdmin> {
  const { data } = await apiClient.get<{ item: VehicleListingDetailAdmin }>(
    `/vehicle-listings/${id}/detail`,
  );
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

import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { NamedRef } from "./vehicle-catalog";
import type { LookupItem } from "./lookups";
import type { VehicleSpecField } from "./vehicle-category-filters";
import type { VehicleListingDiscount } from "./vehicle-listing-discounts";

export type BulkVehicleDiscountCandidateSpecValue = {
  field: VehicleSpecField;
  fieldLabel: LocalizedString;
  value: LookupItem;
};

export type BulkVehicleDiscountCandidate = {
  vehicleListingId: number;
  brand: NamedRef;
  model: NamedRef;
  variant: string;
  year: number;
  condition: LookupItem;
  color: LookupItem;
  specValues: BulkVehicleDiscountCandidateSpecValue[];
  price: number;
  activeDiscount: { discountPercent: number | null; startDate: string; endDate: string } | null;
};

export type BulkApplyVehicleListingDiscountsInput = {
  vehicleListingIds: number[];
  discountPercent: number;
  startDate: string;
  endDate: string;
};

export type VehicleDiscountStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED";

export type VehicleDiscountHistoryRow = {
  id: number;
  vehicleListingId: number;
  brand: NamedRef;
  model: NamedRef;
  variant: string;
  year: number;
  condition: LookupItem;
  color: LookupItem;
  price: number;
  discountPrice: number;
  discountPercent: number | null;
  startDate: string;
  endDate: string;
  computedStatus: VehicleDiscountStatus;
  createdAt: string;
};

export type VehicleDiscountHistoryFilters = {
  status?: "active" | "history";
  search?: string;
};

export async function listVehicleDiscountHistory(
  filters: VehicleDiscountHistoryFilters = {},
): Promise<VehicleDiscountHistoryRow[]> {
  const { data } = await apiClient.get<{ items: VehicleDiscountHistoryRow[] }>(
    "/bulk-vehicle-listing-discounts/discounts",
    { params: { status: filters.status, search: filters.search || undefined } },
  );
  return data.items;
}

export async function listBulkVehicleDiscountCandidates(
  categoryId: number,
): Promise<BulkVehicleDiscountCandidate[]> {
  const { data } = await apiClient.get<{ items: BulkVehicleDiscountCandidate[] }>(
    "/bulk-vehicle-listing-discounts/candidates",
    { params: { categoryId } },
  );
  return data.items;
}

export async function applyBulkVehicleListingDiscounts(
  input: BulkApplyVehicleListingDiscountsInput,
): Promise<VehicleListingDiscount[]> {
  const { data } = await apiClient.post<{ items: VehicleListingDiscount[] }>(
    "/bulk-vehicle-listing-discounts/apply",
    input,
  );
  return data.items;
}

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

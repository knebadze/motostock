import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { BrandModelRef } from "./vehicle-catalog";
import type { AttributeValueType } from "./attributes";
import type { LookupItem } from "./lookups";
import type { VehicleSpecField } from "./vehicle-category-filters";
import type { ProductVariantDiscount } from "./product-variant-discounts";
import type { VehicleListingDiscount } from "./vehicle-listing-discounts";
import type { BulkDiscountEventInput, BulkDiscountEventTargetType } from "./bulk-discount-events";

// One client module for both PRODUCT and VEHICLE_LISTING bulk discounts —
// the apply/date/event-grouping request shape is identical between the two
// (see BulkApplyDiscountsInput), only the candidate/history row shapes
// genuinely differ (product variants vs vehicle listings), so those keep
// their own types below rather than being forced into one shape.
export type BulkDiscountTargetType = BulkDiscountEventTargetType;

// ---- PRODUCT candidates/history ----

export type BulkDiscountCandidateAttributeValue = {
  attributeId: number;
  attributeName: LocalizedString;
  valueType: AttributeValueType;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  option: { id: number; key: string; label: LocalizedString } | null;
};

export type BulkDiscountCandidate = {
  variantId: number;
  productId: number;
  productName: LocalizedString;
  productSlug: string;
  brand: BrandModelRef | null;
  attributeValues: BulkDiscountCandidateAttributeValue[];
  sku: string | null;
  size: LookupItem | null;
  color: LookupItem | null;
  price: number;
  activeDiscount: { discountPercent: number | null; startDate: string; endDate: string } | null;
};

export type ProductDiscountHistoryRow = {
  id: number;
  variantId: number;
  productId: number;
  productName: LocalizedString;
  productSlug: string;
  brand: BrandModelRef | null;
  sku: string | null;
  size: LookupItem | null;
  color: LookupItem | null;
  price: number;
  discountPrice: number;
  discountPercent: number | null;
  startDate: string;
  endDate: string;
  computedStatus: DiscountStatus;
  createdAt: string;
};

// ---- VEHICLE_LISTING candidates/history ----

export type BulkVehicleDiscountCandidateSpecValue = {
  field: VehicleSpecField;
  fieldLabel: LocalizedString;
  value: LookupItem;
};

export type BulkVehicleDiscountCandidate = {
  vehicleListingId: number;
  brand: BrandModelRef;
  model: BrandModelRef;
  variant: string;
  year: number;
  condition: LookupItem;
  color: LookupItem;
  specValues: BulkVehicleDiscountCandidateSpecValue[];
  price: number;
  activeDiscount: { discountPercent: number | null; startDate: string; endDate: string } | null;
};

export type VehicleDiscountHistoryRow = {
  id: number;
  vehicleListingId: number;
  brand: BrandModelRef;
  model: BrandModelRef;
  variant: string;
  year: number;
  condition: LookupItem;
  color: LookupItem;
  price: number;
  discountPrice: number;
  discountPercent: number | null;
  startDate: string;
  endDate: string;
  computedStatus: DiscountStatus;
  createdAt: string;
};

export type DiscountStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED";

// ---- candidates ----

export async function listBulkDiscountCandidates(
  targetType: "PRODUCT",
  categoryId: number,
): Promise<BulkDiscountCandidate[]>;
export async function listBulkDiscountCandidates(
  targetType: "VEHICLE_LISTING",
  categoryId: number,
): Promise<BulkVehicleDiscountCandidate[]>;
export async function listBulkDiscountCandidates(
  targetType: BulkDiscountTargetType,
  categoryId: number,
): Promise<(BulkDiscountCandidate | BulkVehicleDiscountCandidate)[]> {
  const { data } = await apiClient.get<{ items: (BulkDiscountCandidate | BulkVehicleDiscountCandidate)[] }>(
    "/bulk-discounts/candidates",
    { params: { targetType, categoryId } },
  );
  return data.items;
}

// ---- history ----

export type DiscountHistoryFilters = {
  status?: "active" | "history";
  search?: string;
};

export type DiscountHistoryResult<TRow> = {
  items: TRow[];
  total: number;
  // True when the backend's fixed row cap (see this endpoint's own
  // listDiscountHistory) cut off older history — the caller should prompt
  // for a narrower search rather than assume `items` is everything.
  truncated: boolean;
};

export async function listDiscountHistory(
  targetType: "PRODUCT",
  filters?: DiscountHistoryFilters,
): Promise<DiscountHistoryResult<ProductDiscountHistoryRow>>;
export async function listDiscountHistory(
  targetType: "VEHICLE_LISTING",
  filters?: DiscountHistoryFilters,
): Promise<DiscountHistoryResult<VehicleDiscountHistoryRow>>;
export async function listDiscountHistory(
  targetType: BulkDiscountTargetType,
  filters: DiscountHistoryFilters = {},
): Promise<DiscountHistoryResult<ProductDiscountHistoryRow | VehicleDiscountHistoryRow>> {
  const { data } = await apiClient.get<DiscountHistoryResult<ProductDiscountHistoryRow | VehicleDiscountHistoryRow>>(
    "/bulk-discounts/discounts",
    { params: { targetType, status: filters.status, search: filters.search || undefined } },
  );
  return data;
}

// ---- apply ----

export type BulkApplyDiscountsInput = {
  targetType: BulkDiscountTargetType;
  itemIds: number[];
  discountPercent: number;
  startDate: string;
  endDate: string;
  // Optional — grouping this batch under a named event is opt-in, never
  // required. Omitted, the request/response is unchanged from before this
  // field existed.
  event?: BulkDiscountEventInput;
};

export type BulkApplyDiscountsResult = {
  items: (ProductVariantDiscount | VehicleListingDiscount)[];
  // Non-null only when input.event was supplied — the id of the newly
  // created BulkDiscountEvent, so the caller can follow up with
  // uploadBulkDiscountEventImage if an image file was picked.
  eventId: number | null;
};

export async function applyBulkDiscounts(input: BulkApplyDiscountsInput): Promise<BulkApplyDiscountsResult> {
  const { data } = await apiClient.post<BulkApplyDiscountsResult>("/bulk-discounts/apply", input);
  return data;
}

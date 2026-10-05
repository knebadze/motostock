import { apiClient } from "./client";
import type { BulkDiscountEventTargetType } from "./bulk-discount-events";
import type { components } from "./generated/schema";
import type { ApiResponse } from "./generated-helpers";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

// One client module for both PRODUCT and VEHICLE_LISTING bulk discounts —
// the apply/date/event-grouping request shape is identical between the two
// (see BulkApplyDiscountsInput), only the candidate/history row shapes
// genuinely differ (product variants vs vehicle listings), so those keep
// their own types below rather than being forced into one shape.
export type BulkDiscountTargetType = BulkDiscountEventTargetType;

// ---- PRODUCT candidates/history ----

export type BulkDiscountCandidateAttributeValue = BulkDiscountCandidate["attributeValues"][number];

export type BulkDiscountCandidate = Schemas["BulkDiscountCandidate"];

export type ProductDiscountHistoryRow = Schemas["ProductDiscountHistoryRow"];

// ---- VEHICLE_LISTING candidates/history ----

export type BulkVehicleDiscountCandidateSpecValue = BulkVehicleDiscountCandidate["specValues"][number];

export type BulkVehicleDiscountCandidate = Schemas["BulkVehicleDiscountCandidate"];

export type VehicleDiscountHistoryRow = Schemas["VehicleDiscountHistoryRow"];

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

export type BulkApplyDiscountsInput = Schemas["BulkApplyDiscountsInput"];

export type BulkApplyDiscountsResult = ApiResponse<"/bulk-discounts/apply", "post">;

export async function applyBulkDiscounts(input: BulkApplyDiscountsInput): Promise<BulkApplyDiscountsResult> {
  const { data } = await apiClient.post<BulkApplyDiscountsResult>("/bulk-discounts/apply", input);
  return data;
}

import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { BrandModelRef } from "./vehicle-catalog";
import type { AttributeValueType } from "./attributes";
import type { LookupItem } from "./lookups";
import type { ProductVariantDiscount } from "./product-variant-discounts";

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

export type BulkApplyProductDiscountsInput = {
  variantIds: number[];
  discountPercent: number;
  startDate: string;
  endDate: string;
};

export type ProductDiscountStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED";

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
  computedStatus: ProductDiscountStatus;
  createdAt: string;
};

export type ProductDiscountHistoryFilters = {
  status?: "active" | "history";
  search?: string;
};

export async function listBulkDiscountCandidates(categoryId: number): Promise<BulkDiscountCandidate[]> {
  const { data } = await apiClient.get<{ items: BulkDiscountCandidate[] }>(
    "/bulk-product-discounts/candidates",
    { params: { categoryId } },
  );
  return data.items;
}

export type ProductDiscountHistoryResult = {
  items: ProductDiscountHistoryRow[];
  total: number;
  // True when the backend's fixed row cap (see this endpoint's own
  // listProductDiscountHistory) cut off older history — the caller should
  // prompt for a narrower search rather than assume `items` is everything.
  truncated: boolean;
};

export async function listProductDiscountHistory(
  filters: ProductDiscountHistoryFilters = {},
): Promise<ProductDiscountHistoryResult> {
  const { data } = await apiClient.get<ProductDiscountHistoryResult>(
    "/bulk-product-discounts/discounts",
    { params: { status: filters.status, search: filters.search || undefined } },
  );
  return data;
}

export async function applyBulkProductDiscounts(
  input: BulkApplyProductDiscountsInput,
): Promise<ProductVariantDiscount[]> {
  const { data } = await apiClient.post<{ items: ProductVariantDiscount[] }>(
    "/bulk-product-discounts/apply",
    input,
  );
  return data.items;
}

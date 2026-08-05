import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { NamedRef } from "./vehicle-catalog";
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
  brand: NamedRef | null;
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

export async function listBulkDiscountCandidates(categoryId: number): Promise<BulkDiscountCandidate[]> {
  const { data } = await apiClient.get<{ items: BulkDiscountCandidate[] }>(
    "/bulk-product-discounts/candidates",
    { params: { categoryId } },
  );
  return data.items;
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

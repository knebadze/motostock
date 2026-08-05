import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { NamedRef } from "./vehicle-catalog";
import type { LookupItem } from "./lookups";
import type { VehicleSpecField } from "./vehicle-category-filters";

export type PromoCodeDomain = "PRODUCT" | "VEHICLE";
export type PromoCodeStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "DISABLED";

export type PromoCode = {
  id: number;
  code: string;
  domain: PromoCodeDomain;
  category: NamedRef | null;
  productBrand: NamedRef | null;
  attribute: { id: number; name: LocalizedString } | null;
  attributeOption: { id: number; key: string; label: LocalizedString } | null;
  brand: NamedRef | null;
  model: NamedRef | null;
  specField: VehicleSpecField | null;
  specFieldLabel: LocalizedString | null;
  specValue: LookupItem | null;
  discountPercent: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  computedStatus: PromoCodeStatus;
  createdAt: string;
  updatedAt: string;
};

export type PromoCodeInput = {
  domain: PromoCodeDomain;
  code: string;
  categoryId?: number | null;
  productBrandId?: number | null;
  attributeId?: number | null;
  attributeOptionId?: number | null;
  brandId?: number | null;
  modelId?: number | null;
  specField?: VehicleSpecField | null;
  specLookupItemId?: number | null;
  discountPercent: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
};

export type PromoCodeFilters = {
  domain: PromoCodeDomain;
  status?: "active" | "history";
  categoryId?: number;
  search?: string;
};

export async function listPromoCodes(filters: PromoCodeFilters): Promise<PromoCode[]> {
  const { data } = await apiClient.get<{ items: PromoCode[] }>("/promo-codes", {
    params: {
      domain: filters.domain,
      status: filters.status,
      categoryId: filters.categoryId,
      search: filters.search || undefined,
    },
  });
  return data.items;
}

export async function createPromoCode(input: PromoCodeInput): Promise<PromoCode> {
  const { data } = await apiClient.post<{ item: PromoCode }>("/promo-codes", input);
  return data.item;
}

export async function updatePromoCode(
  id: number,
  input: Partial<PromoCodeInput>,
): Promise<PromoCode> {
  const { data } = await apiClient.patch<{ item: PromoCode }>(`/promo-codes/${id}`, input);
  return data.item;
}

export async function deletePromoCode(id: number): Promise<void> {
  await apiClient.delete(`/promo-codes/${id}`);
}

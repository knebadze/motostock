import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { BrandModelRef, NamedRef } from "./vehicle-catalog";
import type { LookupItem } from "./lookups";
import type { VehicleSpecField } from "./vehicle-category-filters";
import type { HeroSlide } from "./hero-slides";

export type PromoCodeDomain = "PRODUCT" | "VEHICLE";
export type PromoCodeStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "DISABLED";

export type PromoCode = {
  id: number;
  code: string;
  domain: PromoCodeDomain;
  category: NamedRef | null;
  productBrand: BrandModelRef | null;
  attribute: { id: number; name: LocalizedString } | null;
  attributeOption: { id: number; key: string; label: LocalizedString } | null;
  brand: BrandModelRef | null;
  model: BrandModelRef | null;
  specField: VehicleSpecField | null;
  specFieldLabel: LocalizedString | null;
  specValue: LookupItem | null;
  discountPercent: number;
  // Total redemptions allowed across every customer — null means unlimited.
  usageLimit: number | null;
  usageCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  computedStatus: PromoCodeStatus;
  // Non-null once the "სლაიდი" action has created this code's homepage
  // hero-slider slide — lets the admin table render that action as
  // create-vs-edit without a separate round trip.
  heroSlideId: number | null;
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
  usageLimit?: number | null;
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

// ---- homepage hero-slider slide ----

export type PromoCodeHeroSlideInput = {
  title: { ka: string; en: string; ru: string };
  subtitle?: { ka: string; en: string; ru: string } | null;
  buttonLabel: { ka: string; en: string; ru: string };
};

export async function getPromoCodeHeroSlide(promoCodeId: number): Promise<HeroSlide> {
  const { data } = await apiClient.get<{ item: HeroSlide }>(`/promo-codes/${promoCodeId}/hero-slide`);
  return data.item;
}

// Create-or-update — one call covers both (see promo-codes.service.ts's
// setPromoCodeHeroSlide, an upsert keyed on the code id).
export async function setPromoCodeHeroSlide(
  promoCodeId: number,
  input: PromoCodeHeroSlideInput,
): Promise<HeroSlide> {
  const { data } = await apiClient.put<{ item: HeroSlide }>(
    `/promo-codes/${promoCodeId}/hero-slide`,
    input,
  );
  return data.item;
}

export async function uploadPromoCodeHeroSlideImage(
  promoCodeId: number,
  file: File,
): Promise<HeroSlide> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ item: HeroSlide }>(
    `/promo-codes/${promoCodeId}/hero-slide/image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.item;
}

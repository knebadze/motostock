import { apiClient } from "./client";
import type { HeroSlide } from "./hero-slides";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type PromoCodeDomain = "PRODUCT" | "VEHICLE";
export type PromoCodeStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "DISABLED";

export type PromoCode = Schemas["PromoCode"];

export type PromoCodeInput = Schemas["CreatePromoCodeInput"];

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

export type PromoCodeHeroSlideInput = Schemas["PromoCodeHeroSlideInput"];

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

import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type HeroSlideType = "CTA" | "VEHICLE_SEARCH" | "INFO" | "CATEGORY_FILTER" | "DISCOUNT" | "POSTER";
export type HeroSlideTextPosition = "LEFT" | "CENTER" | "RIGHT";
export type HeroSlideVerticalPosition = "TOP" | "MIDDLE" | "BOTTOM";

export type HeroSlide = Schemas["HeroSlide"];

export type HeroSlideInput = Schemas["CreateHeroSlideInput"];

export async function listHeroSlides(): Promise<HeroSlide[]> {
  const { data } = await apiClient.get<{ items: HeroSlide[] }>("/hero-slides");
  return data.items;
}

export async function listPublicHeroSlides(): Promise<HeroSlide[]> {
  const { data } = await apiClient.get<{ items: HeroSlide[] }>("/hero-slides/public");
  return data.items;
}

export async function createHeroSlide(input: HeroSlideInput): Promise<HeroSlide> {
  const { data } = await apiClient.post<{ item: HeroSlide }>("/hero-slides", input);
  return data.item;
}

export async function updateHeroSlide(
  id: number,
  input: Partial<HeroSlideInput>,
): Promise<HeroSlide> {
  const { data } = await apiClient.patch<{ item: HeroSlide }>(`/hero-slides/${id}`, input);
  return data.item;
}

export async function uploadHeroSlideImage(id: number, file: File): Promise<HeroSlide> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ item: HeroSlide }>(`/hero-slides/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.item;
}

export async function reorderHeroSlides(ids: number[]): Promise<HeroSlide[]> {
  const { data } = await apiClient.put<{ items: HeroSlide[] }>("/hero-slides/order", { ids });
  return data.items;
}

export async function deleteHeroSlide(id: number): Promise<void> {
  await apiClient.delete(`/hero-slides/${id}`);
}

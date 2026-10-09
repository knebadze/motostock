import { apiClient } from "./client";
import type { HeroSlide } from "./hero-slides";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type BulkDiscountEventTargetType = "PRODUCT" | "VEHICLE_LISTING";

// Embedded (optionally) into BulkApplyDiscountsInput — see bulk-discounts.ts.
// Grouping a bulk apply under a named event is opt-in, never required.
export type BulkDiscountEventInput = Schemas["BulkDiscountEventInput"];

export type BulkDiscountEvent = Schemas["BulkDiscountEvent"];

export type BulkDiscountEventsPage = Schemas["BulkDiscountEventsPage"];

export async function listBulkDiscountEvents(filters: {
  targetType?: BulkDiscountEventTargetType;
  page?: number;
  pageSize?: number;
} = {}): Promise<BulkDiscountEventsPage> {
  const { data } = await apiClient.get<BulkDiscountEventsPage>("/bulk-discount-events", { params: filters });
  return data;
}

export async function repeatBulkDiscountEvent(
  id: number,
  input: { startDate: string; endDate: string },
): Promise<BulkDiscountEvent> {
  const { data } = await apiClient.post<{ item: BulkDiscountEvent }>(
    `/bulk-discount-events/${id}/repeat`,
    input,
  );
  return data.item;
}

export async function updateBulkDiscountEvent(
  id: number,
  input: BulkDiscountEventInput,
): Promise<BulkDiscountEvent> {
  const { data } = await apiClient.patch<{ item: BulkDiscountEvent }>(`/bulk-discount-events/${id}`, input);
  return data.item;
}

export async function uploadBulkDiscountEventImage(id: number, file: File): Promise<BulkDiscountEvent> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ item: BulkDiscountEvent }>(
    `/bulk-discount-events/${id}/image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.item;
}

export async function deleteBulkDiscountEvent(id: number): Promise<void> {
  await apiClient.delete(`/bulk-discount-events/${id}`);
}

// ---- homepage hero-slider slide ----

export type BulkDiscountEventHeroSlideInput = Schemas["BulkDiscountEventHeroSlideInput"];

export async function getBulkDiscountEventHeroSlide(eventId: number): Promise<HeroSlide> {
  const { data } = await apiClient.get<{ item: HeroSlide }>(`/bulk-discount-events/${eventId}/hero-slide`);
  return data.item;
}

// Create-or-update — one call covers both (see bulk-discount-events.service.ts's
// setEventHeroSlide, an upsert keyed on the event id).
export async function setBulkDiscountEventHeroSlide(
  eventId: number,
  input: BulkDiscountEventHeroSlideInput,
): Promise<HeroSlide> {
  const { data } = await apiClient.put<{ item: HeroSlide }>(
    `/bulk-discount-events/${eventId}/hero-slide`,
    input,
  );
  return data.item;
}

export async function uploadBulkDiscountEventHeroSlideImage(
  eventId: number,
  file: File,
): Promise<HeroSlide> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ item: HeroSlide }>(
    `/bulk-discount-events/${eventId}/hero-slide/image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.item;
}

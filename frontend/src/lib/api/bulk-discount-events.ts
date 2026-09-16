import { apiClient } from "./client";
import type { HeroSlide } from "./hero-slides";

export type BulkDiscountEventTargetType = "PRODUCT" | "VEHICLE_LISTING";

// Embedded (optionally) into BulkApplyDiscountsInput — see bulk-discounts.ts.
// Grouping a bulk apply under a named event is opt-in, never required.
export type BulkDiscountEventInput = {
  nameKa: string;
  nameEn: string;
  nameRu: string;
  descriptionKa?: string;
  descriptionEn?: string;
  descriptionRu?: string;
};

export type BulkDiscountEvent = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  imageUrl: string | null;
  targetType: BulkDiscountEventTargetType;
  discountPercent: number;
  startDate: string;
  endDate: string;
  itemCount: number;
  // Non-null once the "სლაიდი" action has created this event's homepage
  // hero-slider slide — lets the admin table render that action as
  // create-vs-edit without a separate round trip.
  heroSlideId: number | null;
  createdAt: string;
};

export type BulkDiscountEventsPage = {
  items: BulkDiscountEvent[];
  total: number;
  page: number;
  pageSize: number;
};

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

export type BulkDiscountEventHeroSlideInput = {
  title: { ka: string; en: string; ru: string };
  subtitle?: { ka: string; en: string; ru: string } | null;
  buttonLabel: { ka: string; en: string; ru: string };
};

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

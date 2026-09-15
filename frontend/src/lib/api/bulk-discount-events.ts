import { apiClient } from "./client";

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

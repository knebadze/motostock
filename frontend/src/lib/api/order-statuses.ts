import { apiClient } from "./client";

export type OrderStatusItem = {
  id: number;
  key: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  sortOrder: number;
};

export type OrderStatusItemInput = {
  key: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
};

export async function listOrderStatuses(): Promise<OrderStatusItem[]> {
  const { data } = await apiClient.get<{ items: OrderStatusItem[] }>("/order-statuses");
  return data.items;
}

export async function createOrderStatus(input: OrderStatusItemInput): Promise<OrderStatusItem> {
  const { data } = await apiClient.post<{ item: OrderStatusItem }>("/order-statuses", input);
  return data.item;
}

export async function updateOrderStatusItem(
  id: number,
  input: Partial<OrderStatusItemInput>,
): Promise<OrderStatusItem> {
  const { data } = await apiClient.patch<{ item: OrderStatusItem }>(
    `/order-statuses/${id}`,
    input,
  );
  return data.item;
}

// One request, swapped atomically in one DB transaction on the backend
// (see moveOrderStatus) — not two independent PATCHes, which had no shared
// transaction and could leave both rows with the same sortOrder if the
// second request failed after the first succeeded.
export async function moveOrderStatus(
  id: number,
  direction: "up" | "down",
): Promise<OrderStatusItem[]> {
  const { data } = await apiClient.post<{ items: OrderStatusItem[] }>(
    `/order-statuses/${id}/move`,
    { direction },
  );
  return data.items;
}

export async function deleteOrderStatus(id: number): Promise<void> {
  await apiClient.delete(`/order-statuses/${id}`);
}

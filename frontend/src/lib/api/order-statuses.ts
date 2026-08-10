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
  sortOrder?: number;
};

export async function listOrderStatuses(): Promise<OrderStatusItem[]> {
  const { data } = await apiClient.get<{ items: OrderStatusItem[] }>("/order-statuses");
  return data.items;
}

export async function createOrderStatus(
  input: Omit<OrderStatusItemInput, "sortOrder">,
): Promise<OrderStatusItem> {
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

export async function deleteOrderStatus(id: number): Promise<void> {
  await apiClient.delete(`/order-statuses/${id}`);
}

import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { CartItemType } from "./cart";
import type { LookupItem } from "./lookups";

export type OrderFulfillmentMethod = "CARD" | "COURIER" | "PICKUP";

export type CheckoutInput = {
  fulfillmentMethod: OrderFulfillmentMethod;
  addressId?: number;
  promoCode?: string;
};

export type OrderItem = {
  id: number | null;
  itemType: CartItemType;
  itemName: LocalizedString;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderShippingSnapshot = {
  phone: string;
  city: { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };
  street: string;
  building: string | null;
  apartment: string | null;
  postalCode: string | null;
};

export type OrderPromoCode = { code: string; discountPercent: number };

export type CheckoutPreview = {
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  promoCode: OrderPromoCode | null;
};

export type Order = CheckoutPreview & {
  id: number;
  orderCode: string;
  status: LookupItem;
  fulfillmentMethod: OrderFulfillmentMethod;
  shippingSnapshot: OrderShippingSnapshot | null;
  createdAt: string;
};

export type OrderSummary = {
  id: number;
  orderCode: string;
  status: LookupItem;
  total: number;
  itemCount: number;
  createdAt: string;
};

export async function previewCheckout(input: CheckoutInput): Promise<CheckoutPreview> {
  const { data } = await apiClient.post<CheckoutPreview>("/orders/checkout/preview", input);
  return data;
}

export async function placeOrder(input: CheckoutInput): Promise<Order> {
  const { data } = await apiClient.post<{ order: Order }>("/orders/checkout", input);
  return data.order;
}

export async function listMyOrders(): Promise<OrderSummary[]> {
  const { data } = await apiClient.get<{ orders: OrderSummary[] }>("/orders/me");
  return data.orders;
}

export async function getMyOrder(id: number): Promise<Order> {
  const { data } = await apiClient.get<{ order: Order }>(`/orders/me/${id}`);
  return data.order;
}

// Admin-only from here down — hits the requireRole(ADMIN)-gated /orders and
// /orders/:id endpoints (not the /orders/me* ones above), so every order is
// visible regardless of buyer, and each row/detail carries a `buyer`.
export type OrderBuyer = { id: number; firstName: string; lastName: string; email: string };

export type AdminOrderSummary = OrderSummary & {
  fulfillmentMethod: OrderFulfillmentMethod;
  buyer: OrderBuyer;
};

export type AdminOrder = Order & { buyer: OrderBuyer };

export type ListOrdersFilters = {
  search?: string;
  statusIds?: number[];
  fulfillmentMethods?: OrderFulfillmentMethod[];
  createdFrom?: string;
  createdTo?: string;
};

export async function listAllOrders(filters: ListOrdersFilters = {}): Promise<AdminOrderSummary[]> {
  const { data } = await apiClient.get<{ orders: AdminOrderSummary[] }>("/orders", {
    params: filters,
  });
  return data.orders;
}

export async function getAnyOrder(id: number): Promise<AdminOrder> {
  const { data } = await apiClient.get<{ order: AdminOrder }>(`/orders/${id}`);
  return data.order;
}

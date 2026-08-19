import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { CartItemType } from "./cart";
import type { LookupItem } from "./lookups";

export type OrderFulfillmentMethod = "CARD" | "COURIER" | "PICKUP";
export type OrderDeliverySpeed = "STANDARD" | "EXPRESS";

export type CheckoutInput = {
  fulfillmentMethod: OrderFulfillmentMethod;
  addressId?: number;
  deliverySpeed?: OrderDeliverySpeed;
  promoCode?: string;
  bankId?: number;
  // Generated once per checkout session (see CheckoutManager.tsx) and resent
  // unchanged on every retry — lets the backend recognize a double-click or
  // timeout-retry and return the original order instead of creating a
  // second one.
  idempotencyKey: string;
};

export type OrderItem = {
  id: number | null;
  itemType: CartItemType;
  // Only set for product items (null for vehicle listings) — lets the admin
  // order-detail view match a FINA stock-sync result back to this line.
  productVariantId: number | null;
  itemName: LocalizedString;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderShippingSnapshot = {
  phone: string;
  city: { id: number; key: string; nameKa: string; nameEn: string; nameRu: string; isTbilisi: boolean };
  street: string;
  building: string | null;
  apartment: string | null;
  postalCode: string | null;
};

export type OrderPromoCode = { code: string; discountPercent: number };

// Only meaningful in a fresh (FINA-synced) preview — a placed order's items
// (OrderItem below) don't carry live stock status, since nothing re-checks
// it after the fact.
export type CheckoutPreviewItem = OrderItem & {
  inStock: boolean;
  availableQuantity: number;
};

export type CheckoutPreview = {
  items: CheckoutPreviewItem[];
  subtotal: number;
  discountTotal: number;
  deliverySpeed: OrderDeliverySpeed | null;
  deliveryCost: number;
  deliveryTimeSnapshot: string | null;
  total: number;
  promoCode: OrderPromoCode | null;
  // True if any item's requested quantity exceeds live stock — block order
  // placement while this is true (see CheckoutManager.tsx).
  hasStockIssues: boolean;
};

export type OrderBank = { id: number; key: string; name: LocalizedString; logoUrl: string | null };

export type Order = {
  id: number;
  orderCode: string;
  status: LookupItem;
  fulfillmentMethod: OrderFulfillmentMethod;
  shippingSnapshot: OrderShippingSnapshot | null;
  createdAt: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  deliverySpeed: OrderDeliverySpeed | null;
  deliveryCost: number;
  deliveryTimeSnapshot: string | null;
  total: number;
  promoCode: OrderPromoCode | null;
  bank: OrderBank | null;
};

export type OrderSummary = {
  id: number;
  orderCode: string;
  status: LookupItem;
  total: number;
  itemCount: number;
  createdAt: string;
  // Estimated from the delivery time text, not a hard commitment — null for
  // PICKUP orders or if the admin's delivery-time text has no parseable
  // number (see backend's computeEstimatedDeliveryDate).
  estimatedDeliveryDate: string | null;
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

export type ReorderItemStatus = "ADDED" | "PARTIAL" | "UNAVAILABLE";

export type ReorderItemResult = {
  itemName: LocalizedString;
  requestedQuantity: number;
  addedQuantity: number;
  status: ReorderItemStatus;
};

export type ReorderResult = { items: ReorderItemResult[] };

// Re-adds a past order's items to the caller's current cart, best-effort
// per item — see ReorderItemResult.status for which ones didn't fully make
// it back in (sold out / no longer exist).
export async function reorderOrder(id: number): Promise<ReorderResult> {
  const { data } = await apiClient.post<ReorderResult>(`/orders/me/${id}/reorder`);
  return data;
}

// Admin-only from here down — hits the requireRole(ADMIN)-gated /orders and
// /orders/:id endpoints (not the /orders/me* ones above), so every order is
// visible regardless of buyer, and each row/detail carries a `buyer`.
export type OrderBuyer = { id: number; firstName: string; lastName: string; email: string };

export type OrderRiskFlagType =
  | "NEW_ACCOUNT_HIGH_VALUE"
  | "ORDER_VELOCITY"
  | "PROMO_CODE_MULTI_ACCOUNT"
  | "SHARED_IP_MULTIPLE_ACCOUNTS";

export type OrderRiskFlag = {
  type: OrderRiskFlagType;
  detail: string | null;
  createdAt: string;
};

// See backend's FinaOrderSyncStatus — whether this order's current state (a
// placed sale, or its return once cancelled) is actually reflected in FINA.
// NOT_APPLICABLE means nothing to retry (no FINA-linked items, or FINA/its
// Settings aren't configured yet) — never shown as an error.
export type FinaOrderSyncStatus = "NOT_APPLICABLE" | "SYNCED" | "FAILED";

export type AdminOrderSummary = OrderSummary & {
  fulfillmentMethod: OrderFulfillmentMethod;
  buyer: OrderBuyer;
  hasRiskFlags: boolean;
  finaSyncStatus: FinaOrderSyncStatus;
};

export type AdminOrder = Order & {
  buyer: OrderBuyer;
  riskFlags: OrderRiskFlag[];
  cancellationReason: LookupItem | null;
  cancellationNote: string | null;
  finaSyncStatus: FinaOrderSyncStatus;
  finaOutOperationId: number | null;
};

export type ListOrdersFilters = {
  search?: string;
  statusIds?: number[];
  fulfillmentMethods?: OrderFulfillmentMethod[];
  createdFrom?: string;
  createdTo?: string;
  flaggedOnly?: boolean;
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

// Emails the buyer a status-specific notification when one is configured
// for the target status (see backend's STATUS_KEY_TO_EMAIL_TEMPLATE).
export async function updateOrderStatus(
  id: number,
  statusId: number,
  cancellationReasonId?: number,
  cancellationNote?: string,
): Promise<AdminOrder> {
  const { data } = await apiClient.patch<{ order: AdminOrder }>(`/orders/${id}/status`, {
    statusId,
    cancellationReasonId,
    cancellationNote,
  });
  return data.order;
}

// Manually retries pushing this order to FINA after a prior failure (see
// backend's retryOrderFinaSync) — pushes the sale if the order isn't
// cancelled, or the return if it is. Throws (ApiRequestError) if there's
// genuinely nothing to retry (FINA not configured, Settings empty, no
// FINA-linked items) or if the FINA call itself fails again.
export async function retryOrderFinaSync(id: number): Promise<AdminOrder> {
  const { data } = await apiClient.post<{ order: AdminOrder }>(`/orders/${id}/fina-sync`);
  return data.order;
}

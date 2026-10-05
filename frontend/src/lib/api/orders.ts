import { apiClient } from "./client";
import type { components } from "./generated/schema";
import type { ApiResponse } from "./generated-helpers";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type OrderFulfillmentMethod = "CARD" | "COURIER" | "PICKUP";
export type OrderDeliverySpeed = "STANDARD" | "EXPRESS";

export type CheckoutInput = Schemas["CheckoutInput"];

export type OrderItem = Schemas["OrderItem"];

export type OrderShippingSnapshot = NonNullable<Order["shippingSnapshot"]>;

export type OrderPromoCode = NonNullable<Order["promoCode"]>;

// Only meaningful in a fresh (FINA-synced) preview — a placed order's items
// (OrderItem below) don't carry live stock status, since nothing re-checks
// it after the fact.
export type CheckoutPreviewItem = OrderItem & {
  inStock: boolean;
  availableQuantity: number;
};

export type CheckoutPreview = Schemas["CheckoutPreview"];

export type OrderBank = NonNullable<Order["bank"]>;

export type Order = Schemas["Order"];

export type OrderSummary = Schemas["OrderSummary"];

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

export type ReorderItemResult = Schemas["ReorderItemResult"];

export type ReorderResult = Schemas["ReorderResult"];

// Re-adds a past order's items to the caller's current cart, best-effort
// per item — see ReorderItemResult.status for which ones didn't fully make
// it back in (sold out / no longer exist).
export async function reorderOrder(id: number): Promise<ReorderResult> {
  const { data } = await apiClient.post<ReorderResult>(`/orders/me/${id}/reorder`);
  return data;
}

// A plain link's href, not an axios call — the browser's own top-level
// navigation already sends the auth cookie (no CORS/fetch-blob dance
// needed), and the backend's Content-Disposition: attachment header is what
// actually triggers the download regardless of the anchor's own attributes.
export function getOrderInvoiceUrl(id: number, locale: "ka" | "en" | "ru"): string {
  return `${apiClient.defaults.baseURL}/orders/me/${id}/invoice?locale=${locale}`;
}

// Staff print views (ADMIN/OPERATOR) — opened in a new tab; the backend
// serves them `inline` so the browser's PDF viewer shows them ready to print.
// A plain link works because it's a top-level GET navigation, which carries
// the SameSite=Lax session cookie to the (same-site) API origin.
export function getAdminOrderInvoiceUrl(id: number): string {
  return `${apiClient.defaults.baseURL}/orders/${id}/invoice?locale=ka`;
}

export function getAdminOrderPackingSlipUrl(id: number): string {
  return `${apiClient.defaults.baseURL}/orders/${id}/packing-slip`;
}

// Admin-only from here down — hits the requireRole(ADMIN)-gated /orders and
// /orders/:id endpoints (not the /orders/me* ones above), so every order is
// visible regardless of buyer, and each row/detail carries a `buyer`.
export type OrderBuyer = AdminOrder["buyer"];

export type OrderRiskFlagType =
  | "NEW_ACCOUNT_HIGH_VALUE"
  | "ORDER_VELOCITY"
  | "PROMO_CODE_MULTI_ACCOUNT"
  | "SHARED_IP_MULTIPLE_ACCOUNTS";

export type OrderRiskFlag = Schemas["OrderRiskFlag"];

// See backend's FinaOrderSyncStatus — whether this order's current state (a
// placed sale, or its return once cancelled) is actually reflected in FINA.
// NOT_APPLICABLE means nothing to retry (no FINA-linked items, or FINA/its
// Settings aren't configured yet) — never shown as an error.
export type FinaOrderSyncStatus = "NOT_APPLICABLE" | "SYNCED" | "FAILED";

// See backend's PaymentStatus — whether a real bank gateway has actually
// confirmed payment, entirely independent of fulfillmentMethod/status. No
// gateway integration exists yet, so every order is NOT_APPLICABLE or
// AWAITING_PAYMENT today; PAID/FAILED/REFUNDED aren't reachable until one
// does.
export type PaymentStatus = "NOT_APPLICABLE" | "AWAITING_PAYMENT" | "PAID" | "FAILED" | "REFUNDED";

export type AdminOrderSummary = Schemas["AdminOrderSummary"];

export type AdminOrder = Schemas["AdminOrder"];

export type ListOrdersFilters = {
  search?: string;
  statusIds?: number[];
  fulfillmentMethods?: OrderFulfillmentMethod[];
  createdFrom?: string;
  createdTo?: string;
  flaggedOnly?: boolean;
  finaFailedOnly?: boolean;
  userId?: number;
  page?: number;
  pageSize?: number;
};

export type AdminOrdersPage = ApiResponse<"/orders", "get">;

// Real server-side pagination (skip/take), not the client-side slicing most
// other admin lists use — the order table has no natural cap the way a
// category or brand list does, so fetching it all up front doesn't scale.
export async function listAllOrders(filters: ListOrdersFilters = {}): Promise<AdminOrdersPage> {
  const { data } = await apiClient.get<AdminOrdersPage>("/orders", {
    params: filters,
  });
  return data;
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

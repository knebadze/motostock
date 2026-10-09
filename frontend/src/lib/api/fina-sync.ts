import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type FinaSyncRun = Schemas["FinaSyncRun"];

export async function getFinaSyncRuns(): Promise<FinaSyncRun[]> {
  const { data } = await apiClient.get<{ runs: FinaSyncRun[] }>("/fina-sync/runs");
  return data.runs;
}

export async function triggerFinaSync(): Promise<FinaSyncRun> {
  const { data } = await apiClient.post<{ run: FinaSyncRun }>("/fina-sync/run");
  return data.run;
}

// newStock null means this variant's finaId wasn't found in FINA's response
// at all (distinct from a genuine 0 stock).
export type OrderStockSyncItem = Schemas["OrderStockSyncResult"]["items"][number];

// `order` is non-null when every linked item was confirmed and a PENDING
// order just got auto-confirmed — the caller swaps in that order.
export type OrderStockSyncResult = Schemas["OrderStockSyncWithOrderResult"];

// Admin order-detail action — re-checks live FINA stock for just this
// order's FINA-linked products (see OrderDetailModal.tsx), not the whole
// catalog (triggerFinaSync above).
export async function syncOrderStock(orderId: number): Promise<OrderStockSyncResult> {
  const { data } = await apiClient.post<OrderStockSyncResult>(`/fina-sync/orders/${orderId}`);
  return data;
}

// Same shape as OrderStockSyncResult minus the order-confirmation field
// (that concept doesn't apply to a bare product) — admin products-list
// per-row action (see ProductsManager.tsx), re-checks just this product's
// own FINA-linked variants.
export type ProductStockSyncResult = Schemas["OrderStockSyncResult"];

export async function syncProductStock(productId: number): Promise<ProductStockSyncResult> {
  const { data } = await apiClient.post<ProductStockSyncResult>(`/fina-sync/products/${productId}`);
  return data;
}

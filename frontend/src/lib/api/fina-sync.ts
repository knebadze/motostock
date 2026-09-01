import { apiClient } from "./client";
import type { AdminOrder } from "./orders";

export type FinaSyncRun = {
  id: number;
  // CHECKOUT is only ever FAILED — a live per-item stock check during
  // checkout that couldn't reach FINA (see backend's syncVariantStockByIds).
  // A successful checkout-time check isn't logged here at all, to avoid a
  // row per shopper visit.
  trigger: "SCHEDULED" | "MANUAL" | "CHECKOUT";
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  startedAt: string;
  finishedAt: string | null;
  variantsChecked: number;
  variantsUpdated: number;
  errorMessage: string | null;
  triggeredBy: { id: number; name: string } | null;
};

export async function getFinaSyncRuns(): Promise<FinaSyncRun[]> {
  const { data } = await apiClient.get<{ runs: FinaSyncRun[] }>("/fina-sync/runs");
  return data.runs;
}

export async function triggerFinaSync(): Promise<FinaSyncRun> {
  const { data } = await apiClient.post<{ run: FinaSyncRun }>("/fina-sync/run");
  return data.run;
}

export type OrderStockSyncItem = {
  productVariantId: number;
  previousStock: number;
  // null means this variant's finaId wasn't found in FINA's response at all
  // (distinct from a genuine 0 stock).
  newStock: number | null;
};

export type OrderStockSyncResult = {
  checked: number;
  updated: number;
  items: OrderStockSyncItem[];
  // Non-null when every linked item was confirmed and the order was PENDING
  // (so this check just auto-confirmed it — see backend's
  // confirmOrderAfterFinaCheck) — the caller should replace its order state
  // with this instead of just the stock items above.
  order: AdminOrder | null;
};

// Admin order-detail action — re-checks live FINA stock for just this
// order's FINA-linked products (see OrderDetailModal.tsx), not the whole
// catalog (triggerFinaSync above).
export async function syncOrderStock(orderId: number): Promise<OrderStockSyncResult> {
  const { data } = await apiClient.post<OrderStockSyncResult>(`/fina-sync/orders/${orderId}`);
  return data;
}

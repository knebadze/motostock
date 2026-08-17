import { apiClient } from "./client";

export type FinaSyncRun = {
  id: number;
  trigger: "SCHEDULED" | "MANUAL";
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
};

// Admin order-detail action — re-checks live FINA stock for just this
// order's FINA-linked products (see OrderDetailModal.tsx), not the whole
// catalog (triggerFinaSync above).
export async function syncOrderStock(orderId: number): Promise<OrderStockSyncResult> {
  const { data } = await apiClient.post<OrderStockSyncResult>(`/fina-sync/orders/${orderId}`);
  return data;
}

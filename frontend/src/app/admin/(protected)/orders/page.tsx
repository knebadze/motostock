import { getOrderStatusesFromServer, getOrdersFromServer } from "@/lib/api/server";
import { OrdersManager } from "@/components/admin/orders/OrdersManager";
import type { ListOrdersFilters } from "@/lib/api/orders";

// Deep-link filters for the dashboard's "needs action" tiles:
// ?status=<status key> (e.g. PENDING), ?flagged=1, ?fina=failed. Status is
// passed by its stable key, not id — statuses are admin-editable rows.
type OrdersSearchParams = { status?: string; flagged?: string; fina?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrdersSearchParams> }) {
  const { status, flagged, fina } = await searchParams;
  const statuses = await getOrderStatusesFromServer();

  const statusId = status ? statuses.find((item) => item.key === status)?.id : undefined;
  const initialFilters: ListOrdersFilters = {
    statusIds: statusId != null ? [statusId] : undefined,
    flaggedOnly: flagged === "1" || undefined,
    finaFailedOnly: fina === "failed" || undefined,
  };

  const initialData = await getOrdersFromServer(initialFilters);

  return <OrdersManager initialData={initialData} statuses={statuses} initialFilters={initialFilters} />;
}

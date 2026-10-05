import { getOrderStatusesFromServer, getOrdersFromServer } from "@/lib/api/server";
import { OrdersManager } from "@/components/admin/orders/OrdersManager";
import type { ListOrdersFilters } from "@/lib/api/orders";

// Deep-link filters for the dashboard's "needs action" tiles:
// ?status=<status key> (e.g. PENDING), ?flagged=1, ?fina=failed. Status is
// passed by its stable key, not id — statuses are admin-editable rows. The
// user-detail modal links here with ?userId=<id> (one customer's orders),
// optionally plus ?order=<id> to open that order's detail right away.
type OrdersSearchParams = { status?: string; flagged?: string; fina?: string; userId?: string; order?: string };

function parsePositiveInt(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrdersSearchParams> }) {
  const { status, flagged, fina, userId, order } = await searchParams;
  const statuses = await getOrderStatusesFromServer();

  const statusId = status ? statuses.find((item) => item.key === status)?.id : undefined;
  const initialFilters: ListOrdersFilters = {
    statusIds: statusId != null ? [statusId] : undefined,
    flaggedOnly: flagged === "1" || undefined,
    finaFailedOnly: fina === "failed" || undefined,
    userId: parsePositiveInt(userId),
  };

  const initialData = await getOrdersFromServer(initialFilters);

  return (
    <OrdersManager
      initialData={initialData}
      statuses={statuses}
      initialFilters={initialFilters}
      initialOpenOrderId={parsePositiveInt(order)}
    />
  );
}

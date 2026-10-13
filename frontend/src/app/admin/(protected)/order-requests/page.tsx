import { getOrderRequestsFromServer, getOrderStatusesFromServer } from "@/lib/api/server";
import { OrderRequestsManager } from "@/components/admin/order-requests/OrderRequestsManager";

export default async function OrderRequestsPage() {
  const [initialOpen, statuses] = await Promise.all([getOrderRequestsFromServer("OPEN"), getOrderStatusesFromServer()]);
  const cancelledStatusId = statuses.find((status) => status.key === "CANCELLED")?.id ?? null;

  // Same per-request remount as /admin/orders — the header button pushes
  // this route while already on it.
  return (
    <OrderRequestsManager key={crypto.randomUUID()} initialOpen={initialOpen} cancelledStatusId={cancelledStatusId} />
  );
}

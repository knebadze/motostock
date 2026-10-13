import {
  getCallbackRequestsFromServer,
  getOrderRequestsFromServer,
  getOrderStatusesFromServer,
} from "@/lib/api/server";
import { RequestsInbox } from "@/components/admin/order-requests/RequestsInbox";

export default async function OrderRequestsPage() {
  const [orderRequests, callbackRequests, statuses] = await Promise.all([
    getOrderRequestsFromServer("OPEN"),
    getCallbackRequestsFromServer("OPEN"),
    getOrderStatusesFromServer(),
  ]);
  const cancelledStatusId = statuses.find((status) => status.key === "CANCELLED")?.id ?? null;

  // Same per-request remount as /admin/orders — the header button pushes
  // this route while already on it.
  return (
    <RequestsInbox
      key={crypto.randomUUID()}
      initialOrderRequests={orderRequests}
      initialCallbackRequests={callbackRequests}
      cancelledStatusId={cancelledStatusId}
    />
  );
}

import { getOrderStatusesFromServer, getOrdersFromServer } from "@/lib/api/server";
import { OrdersManager } from "@/components/admin/orders/OrdersManager";

export default async function OrdersPage() {
  const [orders, statuses] = await Promise.all([
    getOrdersFromServer(),
    getOrderStatusesFromServer(),
  ]);

  return <OrdersManager initialOrders={orders} statuses={statuses} />;
}

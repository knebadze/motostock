import { getLookupItemsFromServer, getOrdersFromServer } from "@/lib/api/server";
import { OrdersManager } from "@/components/admin/orders/OrdersManager";

export default async function OrdersPage() {
  const [orders, statuses] = await Promise.all([
    getOrdersFromServer(),
    getLookupItemsFromServer("order-statuses"),
  ]);

  return <OrdersManager initialOrders={orders} statuses={statuses} />;
}

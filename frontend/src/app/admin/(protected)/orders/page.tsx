import { getOrderStatusesFromServer, getOrdersFromServer } from "@/lib/api/server";
import { OrdersManager } from "@/components/admin/orders/OrdersManager";

export default async function OrdersPage() {
  const [initialData, statuses] = await Promise.all([
    getOrdersFromServer(),
    getOrderStatusesFromServer(),
  ]);

  return <OrdersManager initialData={initialData} statuses={statuses} />;
}

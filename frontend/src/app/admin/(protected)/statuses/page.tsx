import { getLookupItemsFromServer, getOrderStatusesFromServer } from "@/lib/api/server";
import { STATUS_LOOKUP_TYPES } from "@/config/lookup-types";
import { ClassifiersManager } from "@/components/admin/lookups/ClassifiersManager";
import { OrderStatusesManager } from "@/components/admin/order-statuses/OrderStatusesManager";

export default async function StatusesPage() {
  const [items, orderStatuses] = await Promise.all([
    Promise.all(STATUS_LOOKUP_TYPES.map((lookupType) => getLookupItemsFromServer(lookupType.slug))),
    getOrderStatusesFromServer(),
  ]);

  const groups = STATUS_LOOKUP_TYPES.map((lookupType, index) => ({
    type: lookupType.slug,
    initialItems: items[index],
  }));

  return (
    <ClassifiersManager
      title="სტატუსები"
      groups={groups}
      extraTabs={[
        {
          key: "order-statuses",
          label: "შეკვეთის სტატუსები",
          content: <OrderStatusesManager initialItems={orderStatuses} />,
        },
      ]}
    />
  );
}

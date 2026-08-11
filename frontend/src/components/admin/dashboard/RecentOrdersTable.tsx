"use client";

import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { formatDateTime, formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import type { DashboardStats } from "@/lib/api/dashboard";

type RecentOrder = DashboardStats["recentOrders"][number];

const columns: DataTableColumn<RecentOrder>[] = [
  { header: "კოდი", render: (order) => order.orderCode },
  { header: "მყიდველი", render: (order) => order.buyerName },
  { header: "სტატუსი", render: (order) => <OrderStatusBadge status={order.status} /> },
  {
    header: "თანხა",
    render: (order) => formatPrice(order.total),
    cellClassName: "font-semibold text-primary",
  },
  {
    header: "თარიღი",
    render: (order) => formatDateTime(order.createdAt),
    cellClassName: "text-muted-foreground",
  },
];

export function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  return (
    <DataTable
      columns={columns}
      data={orders}
      getRowKey={(order) => order.id}
      emptyMessage="შეკვეთა არ მოიძებნა"
    />
  );
}

"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import type { DashboardStats } from "@/lib/api/dashboard";

type LowStockItem = DashboardStats["lowStockItems"][number];

const TYPE_LABELS: Record<LowStockItem["itemType"], string> = {
  PRODUCT_VARIANT: "პროდუქტი",
  VEHICLE_LISTING: "ტექნიკა",
};

// Variants have no edit page of their own (a product's variants are all
// edited together on its product page); vehicle listings have no per-id
// edit route yet, so that one links to the list page instead.
function itemHref(item: LowStockItem) {
  return item.itemType === "PRODUCT_VARIANT" ? `/admin/products/${item.id}` : "/admin/vehicle-listings";
}

const columns: DataTableColumn<LowStockItem>[] = [
  {
    header: "ტიპი",
    render: (item) => (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {TYPE_LABELS[item.itemType]}
      </span>
    ),
  },
  {
    header: "დასახელება",
    render: (item) => (
      <Link href={itemHref(item)} className="font-medium text-foreground hover:text-primary hover:underline">
        {item.label}
      </Link>
    ),
  },
  {
    header: "ვარიანტი",
    render: (item) => item.variantLabel ?? "—",
    cellClassName: "text-muted-foreground",
  },
  {
    header: "მარაგი",
    render: (item) => item.stockQuantity,
    cellClassName: "font-semibold text-red-600",
  },
];

export function LowStockTable({ items }: { items: LowStockItem[] }) {
  return (
    <DataTable
      columns={columns}
      data={items}
      getRowKey={(item) => item.rowKey}
      emptyMessage="დაბალი მარაგის ერთეული არ არის"
    />
  );
}

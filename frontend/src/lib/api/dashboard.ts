import type { LookupItem } from "./lookups";

export type DashboardLowStockItemType = "PRODUCT_VARIANT" | "VEHICLE_LISTING";

export type DashboardStats = {
  counts: {
    totalOrders: number;
    totalUsers: number;
    totalProducts: number;
    totalVehicleListings: number;
    activePromoCodes: number;
    lowStockCount: number;
  };
  revenueLast30Days: number;
  ordersByStatus: { status: LookupItem; count: number }[];
  recentOrders: {
    id: number;
    orderCode: string;
    buyerName: string;
    status: LookupItem;
    total: number;
    createdAt: string;
  }[];
  lowStockItems: {
    id: number;
    rowKey: string;
    itemType: DashboardLowStockItemType;
    label: string;
    variantLabel: string | null;
    stockQuantity: number;
  }[];
};

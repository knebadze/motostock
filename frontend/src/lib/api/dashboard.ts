import type { LookupItem } from "./lookups";

export type DashboardLowStockItemType = "PRODUCT_VARIANT" | "VEHICLE_LISTING";

export type DashboardSalesSummary = { revenue: number; orderCount: number };

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
  // Non-cancelled orders since the Tbilisi-local start of today / of this
  // week (Monday).
  salesToday: DashboardSalesSummary;
  salesThisWeek: DashboardSalesSummary;
  // All-time counts of orders waiting on staff.
  needsAction: {
    pendingOrders: number;
    confirmedOrders: number;
    finaFailedOrders: number;
    flaggedPendingOrders: number;
  };
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

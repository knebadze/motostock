import { apiClient } from "./client";
import type { LookupItem } from "./lookups";

export type AnalyticsDemandRow = {
  id: number;
  viewCount: number;
  wishlistCount: number;
  cartCount: number;
  quantitySold: number;
  revenue: number;
};

export type AnalyticsProductDemandRow = AnalyticsDemandRow & { nameKa: string };
export type AnalyticsVehicleListingDemandRow = AnalyticsDemandRow & { label: string };

export type AnalyticsOrderStatusCount = { status: LookupItem; count: number };

export type AnalyticsCancellationReasonCount = { reason: LookupItem | null; count: number };

export type AnalyticsRecentCancelledOrder = {
  id: number;
  orderCode: string;
  buyerName: string;
  buyerEmail: string;
  total: number;
  reason: LookupItem | null;
  note: string | null;
  // When the order was cancelled, not when it was placed.
  cancelledAt: string;
};

export type AnalyticsOverview = {
  range: { from: string; to: string };
  financial: {
    revenue: number;
    orderCount: number;
    cancelledCount: number;
    cancellationRate: number;
    lostRevenue: number;
  };
  revenueSeries: { date: string; revenue: number }[];
  ordersByStatus: AnalyticsOrderStatusCount[];
  topProducts: AnalyticsProductDemandRow[];
  topVehicleListings: AnalyticsVehicleListingDemandRow[];
  cancellations: {
    reasonBreakdown: AnalyticsCancellationReasonCount[];
    recentOrders: AnalyticsRecentCancelledOrder[];
  };
};

export type AnalyticsFilters = {
  dateFrom?: string;
  dateTo?: string;
};

export async function getAnalytics(filters: AnalyticsFilters = {}): Promise<AnalyticsOverview> {
  const { data } = await apiClient.get<AnalyticsOverview>("/analytics/overview", {
    params: { dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined },
  });
  return data;
}

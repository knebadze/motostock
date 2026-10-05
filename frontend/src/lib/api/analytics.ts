import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type AnalyticsDemandRow = {
  id: number;
  viewCount: number;
  wishlistCount: number;
  cartCount: number;
  quantitySold: number;
  revenue: number;
};

export type AnalyticsProductDemandRow = AnalyticsOverview["topProducts"][number];
export type AnalyticsVehicleListingDemandRow = AnalyticsOverview["topVehicleListings"][number];

export type AnalyticsOrderStatusCount = AnalyticsOverview["ordersByStatus"][number];

export type AnalyticsCancellationReasonCount = AnalyticsOverview["cancellations"]["reasonBreakdown"][number];

export type AnalyticsRecentCancelledOrder = AnalyticsOverview["cancellations"]["recentOrders"][number];

export type AnalyticsOverview = Schemas["AnalyticsOverview"];

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

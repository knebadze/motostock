import "server-only";
import { cache } from "react";
import { fetchFromServer } from "./core";
import type { PagedResult } from "@/components/shared/Pagination";
import type { FinaSyncRun } from "../fina-sync";
import type { AdminUsersPage } from "../users";
import type { Bank } from "../banks";
import type { ServiceType } from "../service-types";
import type { ServiceRecordsAdminPage } from "../service-records";
import type { PromoCode, PromoCodeDomain } from "../promo-codes";
import type { AdminOrdersPage, ListOrdersFilters } from "../orders";
import type { DashboardStats } from "../dashboard";
import type { AnalyticsFilters, AnalyticsOverview } from "../analytics";
import type { CompatibilityPage } from "../compatibility";
import type { ProductBuyTogetherPage } from "../product-buy-together";
import type { EmailTemplate } from "../email-templates";
import type { OrderStatusItem } from "../order-statuses";
import type { NewsletterSubscriber, NewsletterSubscriberCounts } from "../newsletter";
import type { NewsletterCampaign } from "../newsletter-campaigns";
import type { SuspiciousLoginActivity } from "../fraud";
import type { Session } from "../sessions";
import type { VisitorOverview } from "../visitors";
import type { ErrorLogsPage } from "../error-logs";
import type { ScheduledJobDefinition, ScheduledJobRunsPage } from "../scheduled-jobs";

// Admin-panel reads (users, orders, dashboard/analytics, statuses, jobs, logs, newsletter, fraud, sessions).

export const getUsersFromServer = cache(async (): Promise<AdminUsersPage> => {
  return fetchFromServer<AdminUsersPage, AdminUsersPage>("/users", {
    params: { page: 1, pageSize: 20 },
    fallback: { users: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getEmailTemplatesFromServer = cache(async (): Promise<EmailTemplate[]> => {
  return fetchFromServer<{ items: EmailTemplate[] }, EmailTemplate[]>("/email-templates", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getOrderStatusesFromServer = cache(async (): Promise<OrderStatusItem[]> => {
  // Public endpoint (same reasoning as getCategoriesFromServer) — ordered
  // by sortOrder server-side, so callers don't need to re-sort.
  return fetchFromServer<{ items: OrderStatusItem[] }, OrderStatusItem[]>("/order-statuses", {
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getFinaSyncRunsFromServer = cache(async (): Promise<FinaSyncRun[]> => {
  return fetchFromServer<{ runs: FinaSyncRun[] }, FinaSyncRun[]>("/fina-sync/runs", {
    fallback: [],
    extract: (data) => data.runs,
    requireAuth: true,
  });
});

export const getScheduledJobsFromServer = cache(async (): Promise<ScheduledJobDefinition[]> => {
  return fetchFromServer<{ jobs: ScheduledJobDefinition[] }, ScheduledJobDefinition[]>("/scheduled-jobs", {
    fallback: [],
    extract: (data) => data.jobs,
    requireAuth: true,
  });
});

export const getScheduledJobRunsFromServer = cache(async (): Promise<ScheduledJobRunsPage> => {
  return fetchFromServer<ScheduledJobRunsPage, ScheduledJobRunsPage>("/scheduled-jobs/runs", {
    params: { page: 1, pageSize: 20 },
    fallback: { runs: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getErrorLogsFromServer = cache(async (): Promise<ErrorLogsPage> => {
  return fetchFromServer<ErrorLogsPage, ErrorLogsPage>("/error-logs", {
    params: { page: 1, pageSize: 25 },
    fallback: { logs: [], total: 0, page: 1, pageSize: 25 },
    extract: (data) => data,
    requireAuth: true,
  });
});

// `filters` comes from the orders page's URL (the dashboard's "needs action"
// tiles link there pre-filtered) — see admin/(protected)/orders/page.tsx.
export const getOrdersFromServer = cache(async (filters: ListOrdersFilters = {}): Promise<AdminOrdersPage> => {
  return fetchFromServer<AdminOrdersPage, AdminOrdersPage>("/orders", {
    params: { ...filters, page: 1, pageSize: 20 },
    fallback: { orders: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

const EMPTY_DASHBOARD_STATS: DashboardStats = {
  counts: {
    totalOrders: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalVehicleListings: 0,
    activePromoCodes: 0,
    lowStockCount: 0,
  },
  revenueLast30Days: 0,
  salesToday: { revenue: 0, orderCount: 0 },
  salesThisWeek: { revenue: 0, orderCount: 0 },
  needsAction: { pendingOrders: 0, confirmedOrders: 0, finaFailedOrders: 0, flaggedPendingOrders: 0 },
  ordersByStatus: [],
  recentOrders: [],
  lowStockItems: [],
};

export const getDashboardStatsFromServer = cache(async (): Promise<DashboardStats> => {
  return fetchFromServer<DashboardStats, DashboardStats>("/dashboard/stats", {
    fallback: EMPTY_DASHBOARD_STATS,
    extract: (data) => data,
    requireAuth: true,
  });
});

const EMPTY_ANALYTICS_OVERVIEW: AnalyticsOverview = {
  range: { from: "", to: "" },
  financial: { revenue: 0, orderCount: 0, cancelledCount: 0, cancellationRate: 0, lostRevenue: 0 },
  revenueSeries: [],
  ordersByStatus: [],
  topProducts: [],
  topVehicleListings: [],
  cancellations: { reasonBreakdown: [], recentOrders: [] },
};

export const getAnalyticsFromServer = cache(async (filters: AnalyticsFilters = {}): Promise<AnalyticsOverview> => {
  return fetchFromServer<AnalyticsOverview, AnalyticsOverview>("/analytics/overview", {
    params: { dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined },
    fallback: EMPTY_ANALYTICS_OVERVIEW,
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getCompatibilityFromServer = cache(async (): Promise<CompatibilityPage> => {
  return fetchFromServer<CompatibilityPage, CompatibilityPage>("/compatibility", {
    params: { page: 1, pageSize: 20 },
    fallback: { items: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getProductBuyTogetherFromServer = cache(async (): Promise<ProductBuyTogetherPage> => {
  return fetchFromServer<ProductBuyTogetherPage, ProductBuyTogetherPage>("/product-buy-together", {
    params: { page: 1, pageSize: 20 },
    fallback: { items: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getPromoCodesFromServer = cache(async (domain: PromoCodeDomain): Promise<PromoCode[]> => {
  return fetchFromServer<{ items: PromoCode[] }, PromoCode[]>("/promo-codes", {
    params: { domain },
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getBanksFromServer = cache(async (): Promise<Bank[]> => {
  return fetchFromServer<{ items: Bank[] }, Bank[]>("/banks", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getServiceTypesFromServer = cache(async (): Promise<ServiceType[]> => {
  return fetchFromServer<{ items: ServiceType[] }, ServiceType[]>("/service-types", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

const EMPTY_SERVICE_RECORDS_ADMIN_PAGE: ServiceRecordsAdminPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
};

// Workshop "სერვისის ისტორია" screen's admin-wide overview table's initial
// (server-rendered) load — RecentServiceRecordsPanel.tsx re-fetches
// subsequent pages/filters itself.
export const getServiceRecordsAdminFromServer = cache(async (): Promise<ServiceRecordsAdminPage> => {
  return fetchFromServer<ServiceRecordsAdminPage, ServiceRecordsAdminPage>("/service-records/admin", {
    params: { page: 1, pageSize: 20 },
    fallback: EMPTY_SERVICE_RECORDS_ADMIN_PAGE,
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getNewsletterCampaignsFromServer = cache(async (): Promise<NewsletterCampaign[]> => {
  return fetchFromServer<{ items: NewsletterCampaign[] }, NewsletterCampaign[]>(
    "/newsletter-campaigns",
    { fallback: [], extract: (data) => data.items, requireAuth: true },
  );
});

export const getNewsletterSubscribersFromServer = cache(async (): Promise<PagedResult<NewsletterSubscriber>> => {
  return fetchFromServer<PagedResult<NewsletterSubscriber>, PagedResult<NewsletterSubscriber>>(
    "/newsletter/subscribers",
    {
      params: { page: 1, pageSize: 20 },
      fallback: { items: [], total: 0, page: 1, pageSize: 20 },
      extract: (data) => data,
      requireAuth: true,
    },
  );
});

export const getNewsletterSubscriberCountsFromServer = cache(async (): Promise<NewsletterSubscriberCounts> => {
  return fetchFromServer<NewsletterSubscriberCounts, NewsletterSubscriberCounts>(
    "/newsletter/subscribers/counts",
    {
      fallback: { pending: 0, confirmed: 0, unsubscribed: 0 },
      extract: (data) => data,
      requireAuth: true,
    },
  );
});

export const getSuspiciousLoginActivityFromServer = cache(async (): Promise<SuspiciousLoginActivity> => {
  return fetchFromServer<SuspiciousLoginActivity, SuspiciousLoginActivity>(
    "/fraud/suspicious-logins",
    {
      fallback: { windowMinutes: 0, threshold: 0, byEmail: [], byIp: [] },
      extract: (data) => data,
      requireAuth: true,
    },
  );
});

export const getSessionsFromServer = cache(async (): Promise<PagedResult<Session>> => {
  return fetchFromServer<PagedResult<Session>, PagedResult<Session>>("/sessions", {
    params: { page: 1, pageSize: 20 },
    fallback: { items: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getVisitorOverviewFromServer = cache(async (): Promise<VisitorOverview> => {
  return fetchFromServer<VisitorOverview, VisitorOverview>("/visitors/overview", {
    fallback: { activeNow: 0, todayVisitors: 0, weekVisitors: 0, dailySeries: [] },
    extract: (data) => data,
    requireAuth: true,
  });
});

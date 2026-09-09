// Mirrors the admin UI's AnalyticsDashboardSettingsTab.tsx grouping.
// lowStockThreshold lives here (not its own file) because that's where its
// default (DASHBOARD_DEFAULTS.lowStockThreshold) already lived before this
// split, and it's the same admin tab in practice.
export const ANALYTICS_DEFAULT_WINDOW_DAYS_KEY = "analytics_default_window_days";
export const DASHBOARD_DEMAND_CANDIDATE_LIMIT_KEY = "dashboard_demand_candidate_limit";
export const DASHBOARD_RECENT_CANCELLED_LIMIT_KEY = "dashboard_recent_cancelled_limit";
export const DASHBOARD_RECENT_ORDERS_LIMIT_KEY = "dashboard_recent_orders_limit";
export const DASHBOARD_LOW_STOCK_LIMIT_KEY = "dashboard_low_stock_limit";
export const DASHBOARD_RECENT_ACTIVITY_WINDOW_DAYS_KEY = "dashboard_recent_activity_window_days";
export const LOW_STOCK_THRESHOLD_KEY = "low_stock_threshold";

export const ANALYTICS_DASHBOARD_SETTING_KEYS = [
  ANALYTICS_DEFAULT_WINDOW_DAYS_KEY,
  DASHBOARD_DEMAND_CANDIDATE_LIMIT_KEY,
  DASHBOARD_RECENT_CANCELLED_LIMIT_KEY,
  DASHBOARD_RECENT_ORDERS_LIMIT_KEY,
  DASHBOARD_LOW_STOCK_LIMIT_KEY,
  DASHBOARD_RECENT_ACTIVITY_WINDOW_DAYS_KEY,
  LOW_STOCK_THRESHOLD_KEY,
];

export const ANALYTICS_DEFAULTS = { defaultWindowDays: 30 };

export const DASHBOARD_DEFAULTS = {
  demandCandidateLimit: 10,
  recentCancelledLimit: 10,
  recentOrdersLimit: 8,
  lowStockLimit: 8,
  recentActivityWindowDays: 30,
  lowStockThreshold: 3,
};

// Mirrors the admin UI's SearchRecommendationsSettingsTab.tsx grouping —
// search result bounding and the demand-based recommendation engine live in
// the same admin tab, so they're kept together here too.
export const SEARCH_RESULT_CAP_KEY = "search_result_cap";
export const SALES_SUMMARY_LIMIT_KEY = "sales_summary_limit";
export const RECOMMENDATIONS_DEFAULT_LIMIT_KEY = "recommendations_default_limit";
export const RECOMMENDATIONS_CACHE_TTL_MINUTES_KEY = "recommendations_cache_ttl_minutes";
export const RECOMMENDATION_ORDER_WEIGHT_KEY = "recommendation_order_weight";
export const RECOMMENDATION_WISHLIST_WEIGHT_KEY = "recommendation_wishlist_weight";
export const RECOMMENDATION_VIEW_WEIGHT_KEY = "recommendation_view_weight";
export const RECENTLY_VIEWED_LIMIT_KEY = "recently_viewed_limit";

export const SEARCH_RECOMMENDATIONS_SETTING_KEYS = [
  SEARCH_RESULT_CAP_KEY,
  SALES_SUMMARY_LIMIT_KEY,
  RECOMMENDATIONS_DEFAULT_LIMIT_KEY,
  RECOMMENDATIONS_CACHE_TTL_MINUTES_KEY,
  RECOMMENDATION_ORDER_WEIGHT_KEY,
  RECOMMENDATION_WISHLIST_WEIGHT_KEY,
  RECOMMENDATION_VIEW_WEIGHT_KEY,
  RECENTLY_VIEWED_LIMIT_KEY,
];

export const SEARCH_DEFAULTS = { resultCap: 500, salesSummaryLimit: 10 };

export const RECOMMENDATION_DEFAULTS = {
  defaultLimit: 10,
  cacheTtlMinutes: 5,
  orderWeight: 2,
  wishlistWeight: 1,
  viewWeight: 0.5,
  recentlyViewedLimit: 10,
};

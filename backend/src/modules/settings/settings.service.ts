import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { cache } from "../../lib/cache.js";
import { isVincarioConfigured } from "../vin-decode/vin-decode.providers.js";
import { settingsRepository } from "./settings.repository.js";
import type { UpdateSettingsInput, VinDecodeProvider } from "./settings.schema.js";

export const USE_CLOUD_STORAGE_KEY = "use_cloud_storage";
export const VIN_DECODE_ENABLED_KEY = "vin_decode_enabled";
export const VIN_DECODE_PROVIDER_KEY = "vin_decode_provider";
export const GUEST_WISHLIST_ENABLED_KEY = "guest_wishlist_enabled";
export const GUEST_CART_ENABLED_KEY = "guest_cart_enabled";
export const PROMO_STACKING_ENABLED_KEY = "promo_stacking_enabled";
export const DELIVERY_TBILISI_PRICE_KEY = "delivery_tbilisi_price";
export const DELIVERY_TBILISI_TIME_KEY = "delivery_tbilisi_time";
export const DELIVERY_REGIONS_PRICE_KEY = "delivery_regions_price";
export const DELIVERY_REGIONS_TIME_KEY = "delivery_regions_time";
export const DELIVERY_EXPRESS_PRICE_KEY = "delivery_express_price";
export const DELIVERY_EXPRESS_TIME_KEY = "delivery_express_time";
export const FRAUD_VELOCITY_ORDER_COUNT_KEY = "fraud_velocity_order_count";
export const FRAUD_VELOCITY_WINDOW_MINUTES_KEY = "fraud_velocity_window_minutes";
export const FRAUD_NEW_ACCOUNT_WINDOW_HOURS_KEY = "fraud_new_account_window_hours";
export const FRAUD_HIGH_VALUE_THRESHOLD_KEY = "fraud_high_value_threshold";
export const FRAUD_FAILED_LOGIN_THRESHOLD_KEY = "fraud_failed_login_threshold";
export const FRAUD_FAILED_LOGIN_WINDOW_MINUTES_KEY = "fraud_failed_login_window_minutes";
export const FINA_WEB_CUSTOMER_ID_KEY = "fina_web_customer_id";
export const FINA_WEB_USER_ID_KEY = "fina_web_user_id";
export const CART_MAX_QUANTITY_KEY = "cart_max_quantity";
export const COMPARE_MAX_ITEMS_KEY = "compare_max_items";
export const ANALYTICS_DEFAULT_WINDOW_DAYS_KEY = "analytics_default_window_days";
export const DASHBOARD_DEMAND_CANDIDATE_LIMIT_KEY = "dashboard_demand_candidate_limit";
export const DASHBOARD_RECENT_CANCELLED_LIMIT_KEY = "dashboard_recent_cancelled_limit";
export const DASHBOARD_RECENT_ORDERS_LIMIT_KEY = "dashboard_recent_orders_limit";
export const DASHBOARD_LOW_STOCK_LIMIT_KEY = "dashboard_low_stock_limit";
export const DASHBOARD_RECENT_ACTIVITY_WINDOW_DAYS_KEY = "dashboard_recent_activity_window_days";
export const LOW_STOCK_THRESHOLD_KEY = "low_stock_threshold";
export const SEARCH_RESULT_CAP_KEY = "search_result_cap";
export const SALES_SUMMARY_LIMIT_KEY = "sales_summary_limit";
export const RECOMMENDATIONS_DEFAULT_LIMIT_KEY = "recommendations_default_limit";
export const RECOMMENDATIONS_CACHE_TTL_MINUTES_KEY = "recommendations_cache_ttl_minutes";
export const RECOMMENDATION_ORDER_WEIGHT_KEY = "recommendation_order_weight";
export const RECOMMENDATION_WISHLIST_WEIGHT_KEY = "recommendation_wishlist_weight";
export const RECOMMENDATION_VIEW_WEIGHT_KEY = "recommendation_view_weight";
export const RECENTLY_VIEWED_LIMIT_KEY = "recently_viewed_limit";
export const SESSION_IDLE_TTL_MINUTES_KEY = "session_idle_ttl_minutes";
export const SESSION_ABSOLUTE_TTL_DAYS_KEY = "session_absolute_ttl_days";
export const RESET_TOKEN_TTL_MINUTES_KEY = "reset_token_ttl_minutes";
export const VERIFICATION_TOKEN_TTL_HOURS_KEY = "verification_token_ttl_hours";
export const GUEST_ID_COOKIE_MAX_AGE_DAYS_KEY = "guest_id_cookie_max_age_days";
export const IMAGE_MAX_DIMENSION_PX_KEY = "image_max_dimension_px";
export const IMAGE_WEBP_QUALITY_KEY = "image_webp_quality";
export const FINA_SYNC_INTERVAL_MINUTES_KEY = "fina_sync_interval_minutes";
export const HOMEPAGE_CACHE_TTL_MINUTES_KEY = "homepage_cache_ttl_minutes";

const ALL_SETTING_KEYS = [
  USE_CLOUD_STORAGE_KEY,
  VIN_DECODE_ENABLED_KEY,
  VIN_DECODE_PROVIDER_KEY,
  GUEST_WISHLIST_ENABLED_KEY,
  GUEST_CART_ENABLED_KEY,
  PROMO_STACKING_ENABLED_KEY,
  DELIVERY_TBILISI_PRICE_KEY,
  DELIVERY_TBILISI_TIME_KEY,
  DELIVERY_REGIONS_PRICE_KEY,
  DELIVERY_REGIONS_TIME_KEY,
  DELIVERY_EXPRESS_PRICE_KEY,
  DELIVERY_EXPRESS_TIME_KEY,
  FRAUD_VELOCITY_ORDER_COUNT_KEY,
  FRAUD_VELOCITY_WINDOW_MINUTES_KEY,
  FRAUD_NEW_ACCOUNT_WINDOW_HOURS_KEY,
  FRAUD_HIGH_VALUE_THRESHOLD_KEY,
  FRAUD_FAILED_LOGIN_THRESHOLD_KEY,
  FRAUD_FAILED_LOGIN_WINDOW_MINUTES_KEY,
  FINA_WEB_CUSTOMER_ID_KEY,
  FINA_WEB_USER_ID_KEY,
  CART_MAX_QUANTITY_KEY,
  COMPARE_MAX_ITEMS_KEY,
  ANALYTICS_DEFAULT_WINDOW_DAYS_KEY,
  DASHBOARD_DEMAND_CANDIDATE_LIMIT_KEY,
  DASHBOARD_RECENT_CANCELLED_LIMIT_KEY,
  DASHBOARD_RECENT_ORDERS_LIMIT_KEY,
  DASHBOARD_LOW_STOCK_LIMIT_KEY,
  DASHBOARD_RECENT_ACTIVITY_WINDOW_DAYS_KEY,
  LOW_STOCK_THRESHOLD_KEY,
  SEARCH_RESULT_CAP_KEY,
  SALES_SUMMARY_LIMIT_KEY,
  RECOMMENDATIONS_DEFAULT_LIMIT_KEY,
  RECOMMENDATIONS_CACHE_TTL_MINUTES_KEY,
  RECOMMENDATION_ORDER_WEIGHT_KEY,
  RECOMMENDATION_WISHLIST_WEIGHT_KEY,
  RECOMMENDATION_VIEW_WEIGHT_KEY,
  RECENTLY_VIEWED_LIMIT_KEY,
  SESSION_IDLE_TTL_MINUTES_KEY,
  SESSION_ABSOLUTE_TTL_DAYS_KEY,
  RESET_TOKEN_TTL_MINUTES_KEY,
  VERIFICATION_TOKEN_TTL_HOURS_KEY,
  GUEST_ID_COOKIE_MAX_AGE_DAYS_KEY,
  IMAGE_MAX_DIMENSION_PX_KEY,
  IMAGE_WEBP_QUALITY_KEY,
  FINA_SYNC_INTERVAL_MINUTES_KEY,
  HOMEPAGE_CACHE_TTL_MINUTES_KEY,
];

const FRAUD_DEFAULTS = {
  velocityOrderCount: 3,
  velocityWindowMinutes: 30,
  newAccountWindowHours: 24,
  highValueThreshold: 1000,
  failedLoginThreshold: 5,
  failedLoginWindowMinutes: 15,
};

// In-code fallbacks for every newly-extracted "global number" — same spirit
// as FRAUD_DEFAULTS: what the app already behaved like before these became
// admin-editable, so an unconfigured install (or a deleted row) is
// indistinguishable from today's hardcoded behavior.
const CART_DEFAULTS = { maxQuantity: 99, maxCompareItems: 4 };
const ANALYTICS_DEFAULTS = { defaultWindowDays: 30 };
const DASHBOARD_DEFAULTS = {
  demandCandidateLimit: 10,
  recentCancelledLimit: 10,
  recentOrdersLimit: 8,
  lowStockLimit: 8,
  recentActivityWindowDays: 30,
  lowStockThreshold: 3,
};
const SEARCH_DEFAULTS = { resultCap: 500, salesSummaryLimit: 10 };
const RECOMMENDATION_DEFAULTS = {
  defaultLimit: 10,
  cacheTtlMinutes: 5,
  orderWeight: 2,
  wishlistWeight: 1,
  viewWeight: 0.5,
  recentlyViewedLimit: 10,
};
const SESSION_DEFAULTS = {
  idleTtlMinutes: 120,
  absoluteTtlDays: 30,
  resetTokenTtlMinutes: 60,
  verificationTokenTtlHours: 24,
  guestIdCookieMaxAgeDays: 365,
};
const IMAGE_DEFAULTS = { maxDimensionPx: 1600, webpQuality: 82 };
const FINA_SYNC_DEFAULTS = { intervalMinutes: 15 };
const CACHE_DEFAULTS = { homepageCacheTtlMinutes: 5 };

// Same read-through pattern as lookups.service.ts's listLookupItems, just
// generalized over the return type since settings getters parse to
// boolean/number/string rather than lookups' single array shape.
function cacheKey(settingKey: string) {
  return `settings:${settingKey}`;
}

async function cached<T>(settingKey: string, resolve: () => Promise<T>): Promise<T> {
  const key = cacheKey(settingKey);
  const hit = cache.get<T>(key);
  if (hit !== undefined) return hit;

  const value = await resolve();
  cache.set(key, value);
  return value;
}

function isCloudinaryConfigured() {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
  );
}

export async function isCloudStorageEnabled(): Promise<boolean> {
  return cached(USE_CLOUD_STORAGE_KEY, async () => {
    const setting = await settingsRepository.findByKey(USE_CLOUD_STORAGE_KEY);
    return setting?.value === "true";
  });
}

export async function isVinDecodeEnabled(): Promise<boolean> {
  return cached(VIN_DECODE_ENABLED_KEY, async () => {
    const setting = await settingsRepository.findByKey(VIN_DECODE_ENABLED_KEY);
    return setting?.value === "true";
  });
}

export async function getVinDecodeProvider(): Promise<VinDecodeProvider> {
  return cached(VIN_DECODE_PROVIDER_KEY, async () => {
    const setting = await settingsRepository.findByKey(VIN_DECODE_PROVIDER_KEY);
    return setting?.value === "vincario" ? "vincario" : "nhtsa";
  });
}

export async function isGuestWishlistEnabled(): Promise<boolean> {
  return cached(GUEST_WISHLIST_ENABLED_KEY, async () => {
    const setting = await settingsRepository.findByKey(GUEST_WISHLIST_ENABLED_KEY);
    return setting?.value === "true";
  });
}

export async function isGuestCartEnabled(): Promise<boolean> {
  return cached(GUEST_CART_ENABLED_KEY, async () => {
    const setting = await settingsRepository.findByKey(GUEST_CART_ENABLED_KEY);
    return setting?.value === "true";
  });
}

// Controls whether a checkout promo code stacks on top of an item that
// already has an active ProductVariantDiscount/VehicleListingDiscount, or
// is skipped for that item so the two discounts never combine — see
// orders.service.ts computeCheckoutTotals.
export async function isPromoStackingEnabled(): Promise<boolean> {
  return cached(PROMO_STACKING_ENABLED_KEY, async () => {
    const setting = await settingsRepository.findByKey(PROMO_STACKING_ENABLED_KEY);
    return setting?.value === "true";
  });
}

export async function getDeliveryTbilisiPrice(): Promise<number> {
  return cached(DELIVERY_TBILISI_PRICE_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_TBILISI_PRICE_KEY);
    return Number(setting?.value ?? 0);
  });
}

export async function getDeliveryTbilisiTime(): Promise<string> {
  return cached(DELIVERY_TBILISI_TIME_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_TBILISI_TIME_KEY);
    return setting?.value ?? "";
  });
}

export async function getDeliveryRegionsPrice(): Promise<number> {
  return cached(DELIVERY_REGIONS_PRICE_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_REGIONS_PRICE_KEY);
    return Number(setting?.value ?? 0);
  });
}

export async function getDeliveryRegionsTime(): Promise<string> {
  return cached(DELIVERY_REGIONS_TIME_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_REGIONS_TIME_KEY);
    return setting?.value ?? "";
  });
}

export async function getDeliveryExpressPrice(): Promise<number> {
  return cached(DELIVERY_EXPRESS_PRICE_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_EXPRESS_PRICE_KEY);
    return Number(setting?.value ?? 0);
  });
}

export async function getDeliveryExpressTime(): Promise<string> {
  return cached(DELIVERY_EXPRESS_TIME_KEY, async () => {
    const setting = await settingsRepository.findByKey(DELIVERY_EXPRESS_TIME_KEY);
    return setting?.value ?? "";
  });
}

export async function getFraudVelocityOrderCount(): Promise<number> {
  return cached(FRAUD_VELOCITY_ORDER_COUNT_KEY, async () => {
    const setting = await settingsRepository.findByKey(FRAUD_VELOCITY_ORDER_COUNT_KEY);
    return Number(setting?.value ?? FRAUD_DEFAULTS.velocityOrderCount);
  });
}

export async function getFraudVelocityWindowMinutes(): Promise<number> {
  return cached(FRAUD_VELOCITY_WINDOW_MINUTES_KEY, async () => {
    const setting = await settingsRepository.findByKey(FRAUD_VELOCITY_WINDOW_MINUTES_KEY);
    return Number(setting?.value ?? FRAUD_DEFAULTS.velocityWindowMinutes);
  });
}

export async function getFraudNewAccountWindowHours(): Promise<number> {
  return cached(FRAUD_NEW_ACCOUNT_WINDOW_HOURS_KEY, async () => {
    const setting = await settingsRepository.findByKey(FRAUD_NEW_ACCOUNT_WINDOW_HOURS_KEY);
    return Number(setting?.value ?? FRAUD_DEFAULTS.newAccountWindowHours);
  });
}

export async function getFraudHighValueThreshold(): Promise<number> {
  return cached(FRAUD_HIGH_VALUE_THRESHOLD_KEY, async () => {
    const setting = await settingsRepository.findByKey(FRAUD_HIGH_VALUE_THRESHOLD_KEY);
    return Number(setting?.value ?? FRAUD_DEFAULTS.highValueThreshold);
  });
}

export async function getFraudFailedLoginThreshold(): Promise<number> {
  return cached(FRAUD_FAILED_LOGIN_THRESHOLD_KEY, async () => {
    const setting = await settingsRepository.findByKey(FRAUD_FAILED_LOGIN_THRESHOLD_KEY);
    return Number(setting?.value ?? FRAUD_DEFAULTS.failedLoginThreshold);
  });
}

export async function getFraudFailedLoginWindowMinutes(): Promise<number> {
  return cached(FRAUD_FAILED_LOGIN_WINDOW_MINUTES_KEY, async () => {
    const setting = await settingsRepository.findByKey(FRAUD_FAILED_LOGIN_WINDOW_MINUTES_KEY);
    return Number(setting?.value ?? FRAUD_DEFAULTS.failedLoginWindowMinutes);
  });
}

export async function getCartMaxQuantity(): Promise<number> {
  return cached(CART_MAX_QUANTITY_KEY, async () => {
    const setting = await settingsRepository.findByKey(CART_MAX_QUANTITY_KEY);
    return Number(setting?.value ?? CART_DEFAULTS.maxQuantity);
  });
}

export async function getCompareMaxItems(): Promise<number> {
  return cached(COMPARE_MAX_ITEMS_KEY, async () => {
    const setting = await settingsRepository.findByKey(COMPARE_MAX_ITEMS_KEY);
    return Number(setting?.value ?? CART_DEFAULTS.maxCompareItems);
  });
}

export async function getAnalyticsDefaultWindowDays(): Promise<number> {
  return cached(ANALYTICS_DEFAULT_WINDOW_DAYS_KEY, async () => {
    const setting = await settingsRepository.findByKey(ANALYTICS_DEFAULT_WINDOW_DAYS_KEY);
    return Number(setting?.value ?? ANALYTICS_DEFAULTS.defaultWindowDays);
  });
}

export async function getDashboardDemandCandidateLimit(): Promise<number> {
  return cached(DASHBOARD_DEMAND_CANDIDATE_LIMIT_KEY, async () => {
    const setting = await settingsRepository.findByKey(DASHBOARD_DEMAND_CANDIDATE_LIMIT_KEY);
    return Number(setting?.value ?? DASHBOARD_DEFAULTS.demandCandidateLimit);
  });
}

export async function getDashboardRecentCancelledLimit(): Promise<number> {
  return cached(DASHBOARD_RECENT_CANCELLED_LIMIT_KEY, async () => {
    const setting = await settingsRepository.findByKey(DASHBOARD_RECENT_CANCELLED_LIMIT_KEY);
    return Number(setting?.value ?? DASHBOARD_DEFAULTS.recentCancelledLimit);
  });
}

export async function getDashboardRecentOrdersLimit(): Promise<number> {
  return cached(DASHBOARD_RECENT_ORDERS_LIMIT_KEY, async () => {
    const setting = await settingsRepository.findByKey(DASHBOARD_RECENT_ORDERS_LIMIT_KEY);
    return Number(setting?.value ?? DASHBOARD_DEFAULTS.recentOrdersLimit);
  });
}

export async function getDashboardLowStockLimit(): Promise<number> {
  return cached(DASHBOARD_LOW_STOCK_LIMIT_KEY, async () => {
    const setting = await settingsRepository.findByKey(DASHBOARD_LOW_STOCK_LIMIT_KEY);
    return Number(setting?.value ?? DASHBOARD_DEFAULTS.lowStockLimit);
  });
}

export async function getDashboardRecentActivityWindowDays(): Promise<number> {
  return cached(DASHBOARD_RECENT_ACTIVITY_WINDOW_DAYS_KEY, async () => {
    const setting = await settingsRepository.findByKey(DASHBOARD_RECENT_ACTIVITY_WINDOW_DAYS_KEY);
    return Number(setting?.value ?? DASHBOARD_DEFAULTS.recentActivityWindowDays);
  });
}

export async function getLowStockThreshold(): Promise<number> {
  return cached(LOW_STOCK_THRESHOLD_KEY, async () => {
    const setting = await settingsRepository.findByKey(LOW_STOCK_THRESHOLD_KEY);
    return Number(setting?.value ?? DASHBOARD_DEFAULTS.lowStockThreshold);
  });
}

export async function getSearchResultCap(): Promise<number> {
  return cached(SEARCH_RESULT_CAP_KEY, async () => {
    const setting = await settingsRepository.findByKey(SEARCH_RESULT_CAP_KEY);
    return Number(setting?.value ?? SEARCH_DEFAULTS.resultCap);
  });
}

export async function getSalesSummaryLimit(): Promise<number> {
  return cached(SALES_SUMMARY_LIMIT_KEY, async () => {
    const setting = await settingsRepository.findByKey(SALES_SUMMARY_LIMIT_KEY);
    return Number(setting?.value ?? SEARCH_DEFAULTS.salesSummaryLimit);
  });
}

export async function getRecommendationsDefaultLimit(): Promise<number> {
  return cached(RECOMMENDATIONS_DEFAULT_LIMIT_KEY, async () => {
    const setting = await settingsRepository.findByKey(RECOMMENDATIONS_DEFAULT_LIMIT_KEY);
    return Number(setting?.value ?? RECOMMENDATION_DEFAULTS.defaultLimit);
  });
}

export async function getRecommendationsCacheTtlMinutes(): Promise<number> {
  return cached(RECOMMENDATIONS_CACHE_TTL_MINUTES_KEY, async () => {
    const setting = await settingsRepository.findByKey(RECOMMENDATIONS_CACHE_TTL_MINUTES_KEY);
    return Number(setting?.value ?? RECOMMENDATION_DEFAULTS.cacheTtlMinutes);
  });
}

export async function getRecommendationOrderWeight(): Promise<number> {
  return cached(RECOMMENDATION_ORDER_WEIGHT_KEY, async () => {
    const setting = await settingsRepository.findByKey(RECOMMENDATION_ORDER_WEIGHT_KEY);
    return Number(setting?.value ?? RECOMMENDATION_DEFAULTS.orderWeight);
  });
}

export async function getRecommendationWishlistWeight(): Promise<number> {
  return cached(RECOMMENDATION_WISHLIST_WEIGHT_KEY, async () => {
    const setting = await settingsRepository.findByKey(RECOMMENDATION_WISHLIST_WEIGHT_KEY);
    return Number(setting?.value ?? RECOMMENDATION_DEFAULTS.wishlistWeight);
  });
}

export async function getRecommendationViewWeight(): Promise<number> {
  return cached(RECOMMENDATION_VIEW_WEIGHT_KEY, async () => {
    const setting = await settingsRepository.findByKey(RECOMMENDATION_VIEW_WEIGHT_KEY);
    return Number(setting?.value ?? RECOMMENDATION_DEFAULTS.viewWeight);
  });
}

export async function getRecentlyViewedLimit(): Promise<number> {
  return cached(RECENTLY_VIEWED_LIMIT_KEY, async () => {
    const setting = await settingsRepository.findByKey(RECENTLY_VIEWED_LIMIT_KEY);
    return Number(setting?.value ?? RECOMMENDATION_DEFAULTS.recentlyViewedLimit);
  });
}

export async function getSessionIdleTtlMinutes(): Promise<number> {
  return cached(SESSION_IDLE_TTL_MINUTES_KEY, async () => {
    const setting = await settingsRepository.findByKey(SESSION_IDLE_TTL_MINUTES_KEY);
    return Number(setting?.value ?? SESSION_DEFAULTS.idleTtlMinutes);
  });
}

export async function getSessionAbsoluteTtlDays(): Promise<number> {
  return cached(SESSION_ABSOLUTE_TTL_DAYS_KEY, async () => {
    const setting = await settingsRepository.findByKey(SESSION_ABSOLUTE_TTL_DAYS_KEY);
    return Number(setting?.value ?? SESSION_DEFAULTS.absoluteTtlDays);
  });
}

export async function getResetTokenTtlMinutes(): Promise<number> {
  return cached(RESET_TOKEN_TTL_MINUTES_KEY, async () => {
    const setting = await settingsRepository.findByKey(RESET_TOKEN_TTL_MINUTES_KEY);
    return Number(setting?.value ?? SESSION_DEFAULTS.resetTokenTtlMinutes);
  });
}

export async function getVerificationTokenTtlHours(): Promise<number> {
  return cached(VERIFICATION_TOKEN_TTL_HOURS_KEY, async () => {
    const setting = await settingsRepository.findByKey(VERIFICATION_TOKEN_TTL_HOURS_KEY);
    return Number(setting?.value ?? SESSION_DEFAULTS.verificationTokenTtlHours);
  });
}

export async function getGuestIdCookieMaxAgeDays(): Promise<number> {
  return cached(GUEST_ID_COOKIE_MAX_AGE_DAYS_KEY, async () => {
    const setting = await settingsRepository.findByKey(GUEST_ID_COOKIE_MAX_AGE_DAYS_KEY);
    return Number(setting?.value ?? SESSION_DEFAULTS.guestIdCookieMaxAgeDays);
  });
}

export async function getImageMaxDimensionPx(): Promise<number> {
  return cached(IMAGE_MAX_DIMENSION_PX_KEY, async () => {
    const setting = await settingsRepository.findByKey(IMAGE_MAX_DIMENSION_PX_KEY);
    return Number(setting?.value ?? IMAGE_DEFAULTS.maxDimensionPx);
  });
}

export async function getImageWebpQuality(): Promise<number> {
  return cached(IMAGE_WEBP_QUALITY_KEY, async () => {
    const setting = await settingsRepository.findByKey(IMAGE_WEBP_QUALITY_KEY);
    return Number(setting?.value ?? IMAGE_DEFAULTS.webpQuality);
  });
}

export async function getFinaSyncIntervalMinutes(): Promise<number> {
  return cached(FINA_SYNC_INTERVAL_MINUTES_KEY, async () => {
    const setting = await settingsRepository.findByKey(FINA_SYNC_INTERVAL_MINUTES_KEY);
    return Number(setting?.value ?? FINA_SYNC_DEFAULTS.intervalMinutes);
  });
}

export async function getHomepageCacheTtlMinutes(): Promise<number> {
  return cached(HOMEPAGE_CACHE_TTL_MINUTES_KEY, async () => {
    const setting = await settingsRepository.findByKey(HOMEPAGE_CACHE_TTL_MINUTES_KEY);
    return Number(setting?.value ?? CACHE_DEFAULTS.homepageCacheTtlMinutes);
  });
}

// Nullable settings — unlike every other setting, these have no sane
// built-in default (a wrong FINA contragent/user id would silently write
// sales to the wrong account), so they stay null until an admin sets them,
// same "dormant until configured" spirit as isFinaConfigured() itself.
export async function getFinaWebCustomerId(): Promise<number | null> {
  return cached(FINA_WEB_CUSTOMER_ID_KEY, async () => {
    const setting = await settingsRepository.findByKey(FINA_WEB_CUSTOMER_ID_KEY);
    return setting?.value ? Number(setting.value) : null;
  });
}

export async function getFinaWebUserId(): Promise<number | null> {
  return cached(FINA_WEB_USER_ID_KEY, async () => {
    const setting = await settingsRepository.findByKey(FINA_WEB_USER_ID_KEY);
    return setting?.value ? Number(setting.value) : null;
  });
}

export async function getSettings() {
  return {
    useCloudStorage: await isCloudStorageEnabled(),
    vinDecodeEnabled: await isVinDecodeEnabled(),
    vinDecodeProvider: await getVinDecodeProvider(),
    guestWishlistEnabled: await isGuestWishlistEnabled(),
    guestCartEnabled: await isGuestCartEnabled(),
    promoStackingEnabled: await isPromoStackingEnabled(),
    deliveryTbilisiPrice: await getDeliveryTbilisiPrice(),
    deliveryTbilisiTime: await getDeliveryTbilisiTime(),
    deliveryRegionsPrice: await getDeliveryRegionsPrice(),
    deliveryRegionsTime: await getDeliveryRegionsTime(),
    deliveryExpressPrice: await getDeliveryExpressPrice(),
    deliveryExpressTime: await getDeliveryExpressTime(),
    fraudVelocityOrderCount: await getFraudVelocityOrderCount(),
    fraudVelocityWindowMinutes: await getFraudVelocityWindowMinutes(),
    fraudNewAccountWindowHours: await getFraudNewAccountWindowHours(),
    fraudHighValueThreshold: await getFraudHighValueThreshold(),
    fraudFailedLoginThreshold: await getFraudFailedLoginThreshold(),
    fraudFailedLoginWindowMinutes: await getFraudFailedLoginWindowMinutes(),
    finaWebCustomerId: await getFinaWebCustomerId(),
    finaWebUserId: await getFinaWebUserId(),
    cartMaxQuantity: await getCartMaxQuantity(),
    compareMaxItems: await getCompareMaxItems(),
    analyticsDefaultWindowDays: await getAnalyticsDefaultWindowDays(),
    dashboardDemandCandidateLimit: await getDashboardDemandCandidateLimit(),
    dashboardRecentCancelledLimit: await getDashboardRecentCancelledLimit(),
    dashboardRecentOrdersLimit: await getDashboardRecentOrdersLimit(),
    dashboardLowStockLimit: await getDashboardLowStockLimit(),
    dashboardRecentActivityWindowDays: await getDashboardRecentActivityWindowDays(),
    lowStockThreshold: await getLowStockThreshold(),
    searchResultCap: await getSearchResultCap(),
    salesSummaryLimit: await getSalesSummaryLimit(),
    recommendationsDefaultLimit: await getRecommendationsDefaultLimit(),
    recommendationsCacheTtlMinutes: await getRecommendationsCacheTtlMinutes(),
    recommendationOrderWeight: await getRecommendationOrderWeight(),
    recommendationWishlistWeight: await getRecommendationWishlistWeight(),
    recommendationViewWeight: await getRecommendationViewWeight(),
    recentlyViewedLimit: await getRecentlyViewedLimit(),
    sessionIdleTtlMinutes: await getSessionIdleTtlMinutes(),
    sessionAbsoluteTtlDays: await getSessionAbsoluteTtlDays(),
    resetTokenTtlMinutes: await getResetTokenTtlMinutes(),
    verificationTokenTtlHours: await getVerificationTokenTtlHours(),
    guestIdCookieMaxAgeDays: await getGuestIdCookieMaxAgeDays(),
    imageMaxDimensionPx: await getImageMaxDimensionPx(),
    imageWebpQuality: await getImageWebpQuality(),
    finaSyncIntervalMinutes: await getFinaSyncIntervalMinutes(),
    homepageCacheTtlMinutes: await getHomepageCacheTtlMinutes(),
  };
}

// The only settings data exposed publicly — just enough for a guest-facing
// form to know whether to show the "fill via VIN" button. Everything else
// about Settings (including whether Cloudinary is on) stays admin-only.
export async function getVinDecodeStatus() {
  return {
    enabled: await isVinDecodeEnabled(),
    provider: await getVinDecodeProvider(),
  };
}

async function upsertNullable(key: string, value: number | null) {
  if (value == null) {
    await settingsRepository.delete(key);
  } else {
    await settingsRepository.upsert(key, String(value));
  }
}

export async function updateSettings(input: UpdateSettingsInput) {
  if (input.useCloudStorage && !isCloudinaryConfigured()) {
    throw new ApiError(
      400,
      "ღრუბლოვანი შენახვის ჩართვამდე დააკონფიგურირეთ Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) სერვერის გარემოს ცვლადებში",
    );
  }

  if (input.vinDecodeEnabled && input.vinDecodeProvider === "vincario" && !isVincarioConfigured()) {
    throw new ApiError(
      400,
      "Vincario-ს ჩართვამდე დააკონფიგურირეთ VINCARIO_API_KEY და VINCARIO_SECRET_KEY სერვერის გარემოს ცვლადებში",
    );
  }

  await settingsRepository.upsert(USE_CLOUD_STORAGE_KEY, String(input.useCloudStorage));
  await settingsRepository.upsert(VIN_DECODE_ENABLED_KEY, String(input.vinDecodeEnabled));
  await settingsRepository.upsert(VIN_DECODE_PROVIDER_KEY, input.vinDecodeProvider);
  await settingsRepository.upsert(GUEST_WISHLIST_ENABLED_KEY, String(input.guestWishlistEnabled));
  await settingsRepository.upsert(GUEST_CART_ENABLED_KEY, String(input.guestCartEnabled));
  await settingsRepository.upsert(PROMO_STACKING_ENABLED_KEY, String(input.promoStackingEnabled));
  await settingsRepository.upsert(DELIVERY_TBILISI_PRICE_KEY, String(input.deliveryTbilisiPrice));
  await settingsRepository.upsert(DELIVERY_TBILISI_TIME_KEY, input.deliveryTbilisiTime);
  await settingsRepository.upsert(DELIVERY_REGIONS_PRICE_KEY, String(input.deliveryRegionsPrice));
  await settingsRepository.upsert(DELIVERY_REGIONS_TIME_KEY, input.deliveryRegionsTime);
  await settingsRepository.upsert(DELIVERY_EXPRESS_PRICE_KEY, String(input.deliveryExpressPrice));
  await settingsRepository.upsert(DELIVERY_EXPRESS_TIME_KEY, input.deliveryExpressTime);
  await settingsRepository.upsert(
    FRAUD_VELOCITY_ORDER_COUNT_KEY,
    String(input.fraudVelocityOrderCount),
  );
  await settingsRepository.upsert(
    FRAUD_VELOCITY_WINDOW_MINUTES_KEY,
    String(input.fraudVelocityWindowMinutes),
  );
  await settingsRepository.upsert(
    FRAUD_NEW_ACCOUNT_WINDOW_HOURS_KEY,
    String(input.fraudNewAccountWindowHours),
  );
  await settingsRepository.upsert(
    FRAUD_HIGH_VALUE_THRESHOLD_KEY,
    String(input.fraudHighValueThreshold),
  );
  await settingsRepository.upsert(
    FRAUD_FAILED_LOGIN_THRESHOLD_KEY,
    String(input.fraudFailedLoginThreshold),
  );
  await settingsRepository.upsert(
    FRAUD_FAILED_LOGIN_WINDOW_MINUTES_KEY,
    String(input.fraudFailedLoginWindowMinutes),
  );
  await upsertNullable(FINA_WEB_CUSTOMER_ID_KEY, input.finaWebCustomerId);
  await upsertNullable(FINA_WEB_USER_ID_KEY, input.finaWebUserId);
  await settingsRepository.upsert(CART_MAX_QUANTITY_KEY, String(input.cartMaxQuantity));
  await settingsRepository.upsert(COMPARE_MAX_ITEMS_KEY, String(input.compareMaxItems));
  await settingsRepository.upsert(
    ANALYTICS_DEFAULT_WINDOW_DAYS_KEY,
    String(input.analyticsDefaultWindowDays),
  );
  await settingsRepository.upsert(
    DASHBOARD_DEMAND_CANDIDATE_LIMIT_KEY,
    String(input.dashboardDemandCandidateLimit),
  );
  await settingsRepository.upsert(
    DASHBOARD_RECENT_CANCELLED_LIMIT_KEY,
    String(input.dashboardRecentCancelledLimit),
  );
  await settingsRepository.upsert(
    DASHBOARD_RECENT_ORDERS_LIMIT_KEY,
    String(input.dashboardRecentOrdersLimit),
  );
  await settingsRepository.upsert(
    DASHBOARD_LOW_STOCK_LIMIT_KEY,
    String(input.dashboardLowStockLimit),
  );
  await settingsRepository.upsert(
    DASHBOARD_RECENT_ACTIVITY_WINDOW_DAYS_KEY,
    String(input.dashboardRecentActivityWindowDays),
  );
  await settingsRepository.upsert(LOW_STOCK_THRESHOLD_KEY, String(input.lowStockThreshold));
  await settingsRepository.upsert(SEARCH_RESULT_CAP_KEY, String(input.searchResultCap));
  await settingsRepository.upsert(SALES_SUMMARY_LIMIT_KEY, String(input.salesSummaryLimit));
  await settingsRepository.upsert(
    RECOMMENDATIONS_DEFAULT_LIMIT_KEY,
    String(input.recommendationsDefaultLimit),
  );
  await settingsRepository.upsert(
    RECOMMENDATIONS_CACHE_TTL_MINUTES_KEY,
    String(input.recommendationsCacheTtlMinutes),
  );
  await settingsRepository.upsert(
    RECOMMENDATION_ORDER_WEIGHT_KEY,
    String(input.recommendationOrderWeight),
  );
  await settingsRepository.upsert(
    RECOMMENDATION_WISHLIST_WEIGHT_KEY,
    String(input.recommendationWishlistWeight),
  );
  await settingsRepository.upsert(
    RECOMMENDATION_VIEW_WEIGHT_KEY,
    String(input.recommendationViewWeight),
  );
  await settingsRepository.upsert(RECENTLY_VIEWED_LIMIT_KEY, String(input.recentlyViewedLimit));
  await settingsRepository.upsert(
    SESSION_IDLE_TTL_MINUTES_KEY,
    String(input.sessionIdleTtlMinutes),
  );
  await settingsRepository.upsert(
    SESSION_ABSOLUTE_TTL_DAYS_KEY,
    String(input.sessionAbsoluteTtlDays),
  );
  await settingsRepository.upsert(
    RESET_TOKEN_TTL_MINUTES_KEY,
    String(input.resetTokenTtlMinutes),
  );
  await settingsRepository.upsert(
    VERIFICATION_TOKEN_TTL_HOURS_KEY,
    String(input.verificationTokenTtlHours),
  );
  await settingsRepository.upsert(
    GUEST_ID_COOKIE_MAX_AGE_DAYS_KEY,
    String(input.guestIdCookieMaxAgeDays),
  );
  await settingsRepository.upsert(IMAGE_MAX_DIMENSION_PX_KEY, String(input.imageMaxDimensionPx));
  await settingsRepository.upsert(IMAGE_WEBP_QUALITY_KEY, String(input.imageWebpQuality));
  await settingsRepository.upsert(
    FINA_SYNC_INTERVAL_MINUTES_KEY,
    String(input.finaSyncIntervalMinutes),
  );
  await settingsRepository.upsert(
    HOMEPAGE_CACHE_TTL_MINUTES_KEY,
    String(input.homepageCacheTtlMinutes),
  );

  for (const key of ALL_SETTING_KEYS) cache.del(cacheKey(key));
  return getSettings();
}

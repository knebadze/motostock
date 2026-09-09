import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";
import { cache } from "../../lib/cache.js";
import { isVincarioConfigured } from "../vin-decode/vin-decode.providers.js";
import { settingsRepository } from "./settings.repository.js";
import {
  ALL_SETTING_KEYS,
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
  FRAUD_DEFAULTS,
  FINA_WEB_CUSTOMER_ID_KEY,
  FINA_WEB_USER_ID_KEY,
  FINA_SYNC_INTERVAL_MINUTES_KEY,
  FINA_SYNC_DEFAULTS,
  CART_MAX_QUANTITY_KEY,
  COMPARE_MAX_ITEMS_KEY,
  CART_DEFAULTS,
  ANALYTICS_DEFAULT_WINDOW_DAYS_KEY,
  DASHBOARD_DEMAND_CANDIDATE_LIMIT_KEY,
  DASHBOARD_RECENT_CANCELLED_LIMIT_KEY,
  DASHBOARD_RECENT_ORDERS_LIMIT_KEY,
  DASHBOARD_LOW_STOCK_LIMIT_KEY,
  DASHBOARD_RECENT_ACTIVITY_WINDOW_DAYS_KEY,
  LOW_STOCK_THRESHOLD_KEY,
  ANALYTICS_DEFAULTS,
  DASHBOARD_DEFAULTS,
  SEARCH_RESULT_CAP_KEY,
  SALES_SUMMARY_LIMIT_KEY,
  RECOMMENDATIONS_DEFAULT_LIMIT_KEY,
  RECOMMENDATIONS_CACHE_TTL_MINUTES_KEY,
  RECOMMENDATION_ORDER_WEIGHT_KEY,
  RECOMMENDATION_WISHLIST_WEIGHT_KEY,
  RECOMMENDATION_VIEW_WEIGHT_KEY,
  RECENTLY_VIEWED_LIMIT_KEY,
  SEARCH_DEFAULTS,
  RECOMMENDATION_DEFAULTS,
  SESSION_IDLE_TTL_MINUTES_KEY,
  SESSION_ABSOLUTE_TTL_DAYS_KEY,
  RESET_TOKEN_TTL_MINUTES_KEY,
  VERIFICATION_TOKEN_TTL_HOURS_KEY,
  GUEST_ID_COOKIE_MAX_AGE_DAYS_KEY,
  SESSION_DEFAULTS,
  IMAGE_MAX_DIMENSION_PX_KEY,
  IMAGE_WEBP_QUALITY_KEY,
  IMAGE_DEFAULTS,
  HOMEPAGE_CACHE_TTL_MINUTES_KEY,
  CACHE_DEFAULTS,
} from "./constants/index.js";
import type { Prisma } from "../../generated/prisma/index.js";
import type { UpdateSettingsInput, VinDecodeProvider } from "./settings.schema.js";

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

async function upsertNullable(key: string, value: number | null, tx: Prisma.TransactionClient) {
  if (value == null) {
    await settingsRepository.delete(key, tx);
  } else {
    await settingsRepository.upsert(key, String(value), tx);
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

  // All ~44 settings are written in one transaction — was a bare sequence
  // of independent upserts, so a failure partway through (a DB blip,
  // connection drop, timeout on any one of them) left everything written
  // so far persisted and everything after it not, silently mixing old and
  // new values across fraud thresholds, delivery pricing, cart limits,
  // dashboard limits, FINA web IDs, etc. with no rollback and nothing
  // telling the admin which fields actually saved. Now it's all-or-nothing:
  // either the whole form's worth of settings lands together, or none of it
  // does and the admin sees a clean error to retry.
  await prisma.$transaction(async (tx) => {
    await settingsRepository.upsert(USE_CLOUD_STORAGE_KEY, String(input.useCloudStorage), tx);
    await settingsRepository.upsert(VIN_DECODE_ENABLED_KEY, String(input.vinDecodeEnabled), tx);
    await settingsRepository.upsert(VIN_DECODE_PROVIDER_KEY, input.vinDecodeProvider, tx);
    await settingsRepository.upsert(
      GUEST_WISHLIST_ENABLED_KEY,
      String(input.guestWishlistEnabled),
      tx,
    );
    await settingsRepository.upsert(GUEST_CART_ENABLED_KEY, String(input.guestCartEnabled), tx);
    await settingsRepository.upsert(
      PROMO_STACKING_ENABLED_KEY,
      String(input.promoStackingEnabled),
      tx,
    );
    await settingsRepository.upsert(
      DELIVERY_TBILISI_PRICE_KEY,
      String(input.deliveryTbilisiPrice),
      tx,
    );
    await settingsRepository.upsert(DELIVERY_TBILISI_TIME_KEY, input.deliveryTbilisiTime, tx);
    await settingsRepository.upsert(
      DELIVERY_REGIONS_PRICE_KEY,
      String(input.deliveryRegionsPrice),
      tx,
    );
    await settingsRepository.upsert(DELIVERY_REGIONS_TIME_KEY, input.deliveryRegionsTime, tx);
    await settingsRepository.upsert(
      DELIVERY_EXPRESS_PRICE_KEY,
      String(input.deliveryExpressPrice),
      tx,
    );
    await settingsRepository.upsert(DELIVERY_EXPRESS_TIME_KEY, input.deliveryExpressTime, tx);
    await settingsRepository.upsert(
      FRAUD_VELOCITY_ORDER_COUNT_KEY,
      String(input.fraudVelocityOrderCount),
      tx,
    );
    await settingsRepository.upsert(
      FRAUD_VELOCITY_WINDOW_MINUTES_KEY,
      String(input.fraudVelocityWindowMinutes),
      tx,
    );
    await settingsRepository.upsert(
      FRAUD_NEW_ACCOUNT_WINDOW_HOURS_KEY,
      String(input.fraudNewAccountWindowHours),
      tx,
    );
    await settingsRepository.upsert(
      FRAUD_HIGH_VALUE_THRESHOLD_KEY,
      String(input.fraudHighValueThreshold),
      tx,
    );
    await settingsRepository.upsert(
      FRAUD_FAILED_LOGIN_THRESHOLD_KEY,
      String(input.fraudFailedLoginThreshold),
      tx,
    );
    await settingsRepository.upsert(
      FRAUD_FAILED_LOGIN_WINDOW_MINUTES_KEY,
      String(input.fraudFailedLoginWindowMinutes),
      tx,
    );
    await upsertNullable(FINA_WEB_CUSTOMER_ID_KEY, input.finaWebCustomerId, tx);
    await upsertNullable(FINA_WEB_USER_ID_KEY, input.finaWebUserId, tx);
    await settingsRepository.upsert(CART_MAX_QUANTITY_KEY, String(input.cartMaxQuantity), tx);
    await settingsRepository.upsert(COMPARE_MAX_ITEMS_KEY, String(input.compareMaxItems), tx);
    await settingsRepository.upsert(
      ANALYTICS_DEFAULT_WINDOW_DAYS_KEY,
      String(input.analyticsDefaultWindowDays),
      tx,
    );
    await settingsRepository.upsert(
      DASHBOARD_DEMAND_CANDIDATE_LIMIT_KEY,
      String(input.dashboardDemandCandidateLimit),
      tx,
    );
    await settingsRepository.upsert(
      DASHBOARD_RECENT_CANCELLED_LIMIT_KEY,
      String(input.dashboardRecentCancelledLimit),
      tx,
    );
    await settingsRepository.upsert(
      DASHBOARD_RECENT_ORDERS_LIMIT_KEY,
      String(input.dashboardRecentOrdersLimit),
      tx,
    );
    await settingsRepository.upsert(
      DASHBOARD_LOW_STOCK_LIMIT_KEY,
      String(input.dashboardLowStockLimit),
      tx,
    );
    await settingsRepository.upsert(
      DASHBOARD_RECENT_ACTIVITY_WINDOW_DAYS_KEY,
      String(input.dashboardRecentActivityWindowDays),
      tx,
    );
    await settingsRepository.upsert(LOW_STOCK_THRESHOLD_KEY, String(input.lowStockThreshold), tx);
    await settingsRepository.upsert(SEARCH_RESULT_CAP_KEY, String(input.searchResultCap), tx);
    await settingsRepository.upsert(SALES_SUMMARY_LIMIT_KEY, String(input.salesSummaryLimit), tx);
    await settingsRepository.upsert(
      RECOMMENDATIONS_DEFAULT_LIMIT_KEY,
      String(input.recommendationsDefaultLimit),
      tx,
    );
    await settingsRepository.upsert(
      RECOMMENDATIONS_CACHE_TTL_MINUTES_KEY,
      String(input.recommendationsCacheTtlMinutes),
      tx,
    );
    await settingsRepository.upsert(
      RECOMMENDATION_ORDER_WEIGHT_KEY,
      String(input.recommendationOrderWeight),
      tx,
    );
    await settingsRepository.upsert(
      RECOMMENDATION_WISHLIST_WEIGHT_KEY,
      String(input.recommendationWishlistWeight),
      tx,
    );
    await settingsRepository.upsert(
      RECOMMENDATION_VIEW_WEIGHT_KEY,
      String(input.recommendationViewWeight),
      tx,
    );
    await settingsRepository.upsert(
      RECENTLY_VIEWED_LIMIT_KEY,
      String(input.recentlyViewedLimit),
      tx,
    );
    await settingsRepository.upsert(
      SESSION_IDLE_TTL_MINUTES_KEY,
      String(input.sessionIdleTtlMinutes),
      tx,
    );
    await settingsRepository.upsert(
      SESSION_ABSOLUTE_TTL_DAYS_KEY,
      String(input.sessionAbsoluteTtlDays),
      tx,
    );
    await settingsRepository.upsert(
      RESET_TOKEN_TTL_MINUTES_KEY,
      String(input.resetTokenTtlMinutes),
      tx,
    );
    await settingsRepository.upsert(
      VERIFICATION_TOKEN_TTL_HOURS_KEY,
      String(input.verificationTokenTtlHours),
      tx,
    );
    await settingsRepository.upsert(
      GUEST_ID_COOKIE_MAX_AGE_DAYS_KEY,
      String(input.guestIdCookieMaxAgeDays),
      tx,
    );
    await settingsRepository.upsert(
      IMAGE_MAX_DIMENSION_PX_KEY,
      String(input.imageMaxDimensionPx),
      tx,
    );
    await settingsRepository.upsert(IMAGE_WEBP_QUALITY_KEY, String(input.imageWebpQuality), tx);
    await settingsRepository.upsert(
      FINA_SYNC_INTERVAL_MINUTES_KEY,
      String(input.finaSyncIntervalMinutes),
      tx,
    );
    await settingsRepository.upsert(
      HOMEPAGE_CACHE_TTL_MINUTES_KEY,
      String(input.homepageCacheTtlMinutes),
      tx,
    );
  });

  for (const key of ALL_SETTING_KEYS) cache.del(cacheKey(key));
  return getSettings();
}

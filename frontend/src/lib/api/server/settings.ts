import "server-only";
import { cache } from "react";
import { fetchFromServer } from "./core";
import type { Settings, VinDecodeProvider } from "../settings";

// Site settings and feature flags read during SSR.

const SETTINGS_FALLBACK: Settings = {
  useCloudStorage: false,
  vinDecodeEnabled: false,
  vinDecodeProvider: "nhtsa",
  guestWishlistEnabled: false,
  guestCartEnabled: false,
  promoStackingEnabled: false,
  whatsappSupportPhoneNumber: null,
  adminNotificationEmail: null,
  deliveryTbilisiPrice: 0,
  deliveryTbilisiTime: "",
  deliveryRegionsPrice: 0,
  deliveryRegionsTime: "",
  deliveryExpressPrice: 0,
  deliveryExpressTime: "",
  fraudVelocityOrderCount: 3,
  fraudVelocityWindowMinutes: 30,
  fraudNewAccountWindowHours: 24,
  fraudHighValueThreshold: 1000,
  fraudFailedLoginThreshold: 5,
  fraudFailedLoginWindowMinutes: 15,
  finaWebCustomerId: null,
  finaWebUserId: null,
  cartMaxQuantity: 99,
  compareMaxItems: 4,
  analyticsDefaultWindowDays: 30,
  dashboardDemandCandidateLimit: 10,
  dashboardRecentCancelledLimit: 10,
  dashboardRecentOrdersLimit: 8,
  dashboardLowStockLimit: 8,
  dashboardRecentActivityWindowDays: 30,
  lowStockThreshold: 3,
  searchResultCap: 500,
  salesSummaryLimit: 10,
  recommendationsDefaultLimit: 10,
  recommendationsCacheTtlMinutes: 5,
  recommendationOrderWeight: 2,
  recommendationWishlistWeight: 1,
  recommendationViewWeight: 0.5,
  recentlyViewedLimit: 10,
  sessionIdleTtlMinutes: 120,
  sessionAbsoluteTtlDays: 30,
  resetTokenTtlMinutes: 60,
  verificationTokenTtlHours: 24,
  guestIdCookieMaxAgeDays: 365,
  imageMaxDimensionPx: 1600,
  imageWebpQuality: 82,
  finaSyncIntervalMinutes: 15,
  homepageCacheTtlMinutes: 5,
};

export const getSettingsFromServer = cache(async (): Promise<Settings> => {
  return fetchFromServer<{ settings: Settings }, Settings>("/settings", {
    fallback: SETTINGS_FALLBACK,
    extract: (data) => data.settings,
    requireAuth: true,
  });
});

export const getVinDecodeStatusFromServer = cache(
  async (): Promise<{ enabled: boolean; provider: VinDecodeProvider }> => {
    return fetchFromServer<
      { enabled: boolean; provider: VinDecodeProvider },
      { enabled: boolean; provider: VinDecodeProvider }
    >("/settings/vin-decode-status", {
      fallback: { enabled: false, provider: "nhtsa" },
      extract: (data) => data,
    });
  },
);

export type GuestFeatureStatus = { guestWishlistEnabled: boolean; guestCartEnabled: boolean };

export const getGuestFeatureStatusFromServer = cache(async (): Promise<GuestFeatureStatus> => {
  return fetchFromServer<GuestFeatureStatus, GuestFeatureStatus>("/settings/guest-feature-status", {
    // Fails closed: if this lookup itself fails, WishlistButton/
    // AddToCartButton just fall back to always attempting their status
    // check (today's behavior) rather than assuming a guest feature is on.
    fallback: { guestWishlistEnabled: false, guestCartEnabled: false },
    extract: (data) => data,
  });
});

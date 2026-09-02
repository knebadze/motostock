import { apiClient } from "./client";

export type VinDecodeProvider = "nhtsa" | "vincario";

export type Settings = {
  useCloudStorage: boolean;
  vinDecodeEnabled: boolean;
  vinDecodeProvider: VinDecodeProvider;
  guestWishlistEnabled: boolean;
  guestCartEnabled: boolean;
  promoStackingEnabled: boolean;
  deliveryTbilisiPrice: number;
  deliveryTbilisiTime: string;
  deliveryRegionsPrice: number;
  deliveryRegionsTime: string;
  deliveryExpressPrice: number;
  deliveryExpressTime: string;
  fraudVelocityOrderCount: number;
  fraudVelocityWindowMinutes: number;
  fraudNewAccountWindowHours: number;
  fraudHighValueThreshold: number;
  fraudFailedLoginThreshold: number;
  fraudFailedLoginWindowMinutes: number;
  finaWebCustomerId: number | null;
  finaWebUserId: number | null;
  cartMaxQuantity: number;
  compareMaxItems: number;
  analyticsDefaultWindowDays: number;
  dashboardDemandCandidateLimit: number;
  dashboardRecentCancelledLimit: number;
  dashboardRecentOrdersLimit: number;
  dashboardLowStockLimit: number;
  dashboardRecentActivityWindowDays: number;
  lowStockThreshold: number;
  searchResultCap: number;
  salesSummaryLimit: number;
  recommendationsDefaultLimit: number;
  recommendationsCacheTtlMinutes: number;
  recommendationOrderWeight: number;
  recommendationWishlistWeight: number;
  recommendationViewWeight: number;
  recentlyViewedLimit: number;
  sessionIdleTtlMinutes: number;
  sessionAbsoluteTtlDays: number;
  resetTokenTtlMinutes: number;
  verificationTokenTtlHours: number;
  guestIdCookieMaxAgeDays: number;
  imageMaxDimensionPx: number;
  imageWebpQuality: number;
  finaSyncIntervalMinutes: number;
  homepageCacheTtlMinutes: number;
};

export async function getSettings(): Promise<Settings> {
  const { data } = await apiClient.get<{ settings: Settings }>("/settings");
  return data.settings;
}

export async function updateSettings(input: Settings): Promise<Settings> {
  const { data } = await apiClient.patch<{ settings: Settings }>("/settings", input);
  return data.settings;
}

import { z } from "zod";
import { registry } from "../../docs/registry.js";

const vinDecodeProviderSchema = z.enum(["nhtsa", "vincario"]);
export type VinDecodeProvider = z.infer<typeof vinDecodeProviderSchema>;

export const updateSettingsSchema = registry.register(
  "UpdateSettingsInput",
  z.object({
    useCloudStorage: z.boolean().openapi({ example: true }),
    vinDecodeEnabled: z.boolean().openapi({ example: false }),
    vinDecodeProvider: vinDecodeProviderSchema.openapi({ example: "nhtsa" }),
    guestWishlistEnabled: z.boolean().openapi({ example: false }),
    guestCartEnabled: z.boolean().openapi({ example: false }),
    promoStackingEnabled: z.boolean().openapi({ example: false }),
    deliveryTbilisiPrice: z.number().nonnegative().openapi({ example: 15 }),
    deliveryTbilisiTime: z.string().openapi({ example: "1-2 სამუშაო დღე" }),
    deliveryRegionsPrice: z.number().nonnegative().openapi({ example: 25 }),
    deliveryRegionsTime: z.string().openapi({ example: "3-5 სამუშაო დღე" }),
    deliveryExpressPrice: z.number().nonnegative().openapi({ example: 40 }),
    deliveryExpressTime: z.string().openapi({ example: "2-4 საათი" }),
    fraudVelocityOrderCount: z.int().positive().openapi({ example: 3 }),
    fraudVelocityWindowMinutes: z.int().positive().openapi({ example: 30 }),
    fraudNewAccountWindowHours: z.int().positive().openapi({ example: 24 }),
    fraudHighValueThreshold: z.number().nonnegative().openapi({ example: 1000 }),
    // Capped (unlike this file's other positive-only numeric settings) —
    // this is the brute-force lockout threshold (see fraud.service.ts's
    // runWithAccountLockoutGuard); an admin fat-fingering (or a compromised
    // admin session setting) an astronomically large value here would
    // silently neuter the lockout, since it would then never trigger in
    // practice. 100 is already far looser than any legitimate threshold.
    fraudFailedLoginThreshold: z.int().positive().max(100).openapi({ example: 5 }),
    fraudFailedLoginWindowMinutes: z.int().positive().openapi({ example: 15 }),
    finaWebCustomerId: z.int().positive().nullable().openapi({ example: null }),
    finaWebUserId: z.int().positive().nullable().openapi({ example: null }),
    cartMaxQuantity: z.int().positive().openapi({ example: 99 }),
    compareMaxItems: z.int().positive().openapi({ example: 4 }),
    analyticsDefaultWindowDays: z.int().positive().openapi({ example: 30 }),
    dashboardDemandCandidateLimit: z.int().positive().openapi({ example: 10 }),
    dashboardRecentCancelledLimit: z.int().positive().openapi({ example: 10 }),
    dashboardRecentOrdersLimit: z.int().positive().openapi({ example: 8 }),
    dashboardLowStockLimit: z.int().positive().openapi({ example: 8 }),
    dashboardRecentActivityWindowDays: z.int().positive().openapi({ example: 30 }),
    lowStockThreshold: z.int().positive().openapi({ example: 3 }),
    searchResultCap: z.int().positive().openapi({ example: 500 }),
    salesSummaryLimit: z.int().positive().openapi({ example: 10 }),
    recommendationsDefaultLimit: z.int().positive().openapi({ example: 10 }),
    recommendationsCacheTtlMinutes: z.int().positive().openapi({ example: 5 }),
    recommendationOrderWeight: z.number().nonnegative().openapi({ example: 2 }),
    recommendationWishlistWeight: z.number().nonnegative().openapi({ example: 1 }),
    recommendationViewWeight: z.number().nonnegative().openapi({ example: 0.5 }),
    recentlyViewedLimit: z.int().positive().openapi({ example: 10 }),
    // Capped for the same reason as fraudFailedLoginThreshold above — an
    // unbounded idle/absolute session TTL would let a session (and the
    // cookie carrying it, if ever exfiltrated) stay valid effectively
    // forever instead of the sliding-idle-timeout/absolute-cap security
    // control (auth.middleware.ts) actually doing anything. A week of idle
    // time and a year of absolute lifetime are already far looser than any
    // legitimate configuration.
    sessionIdleTtlMinutes: z.int().positive().max(10080).openapi({ example: 120 }),
    sessionAbsoluteTtlDays: z.int().positive().max(365).openapi({ example: 30 }),
    // Same reasoning as the session TTLs above — an unbounded value would
    // let a password-reset or email-verification link stay valid
    // indefinitely if it ever leaked (a forwarded email, a shared inbox),
    // defeating the whole point of it expiring. A day for a reset link and
    // a week for a verification link are already far looser than any
    // legitimate configuration.
    resetTokenTtlMinutes: z.int().positive().max(1440).openapi({ example: 60 }),
    verificationTokenTtlHours: z.int().positive().max(168).openapi({ example: 24 }),
    guestIdCookieMaxAgeDays: z.int().positive().openapi({ example: 365 }),
    imageMaxDimensionPx: z.int().positive().openapi({ example: 1600 }),
    imageWebpQuality: z.int().min(1).max(100).openapi({ example: 82 }),
    finaSyncIntervalMinutes: z.int().positive().openapi({ example: 15 }),
    homepageCacheTtlMinutes: z.int().positive().openapi({ example: 5 }),
  }),
);
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const settingsResponseSchema = registry.register(
  "Settings",
  z.object({
    useCloudStorage: z.boolean().openapi({ example: false }),
    vinDecodeEnabled: z.boolean().openapi({ example: false }),
    vinDecodeProvider: vinDecodeProviderSchema.openapi({ example: "nhtsa" }),
    guestWishlistEnabled: z.boolean().openapi({ example: false }),
    guestCartEnabled: z.boolean().openapi({ example: false }),
    promoStackingEnabled: z.boolean().openapi({ example: false }),
    deliveryTbilisiPrice: z.number().nonnegative().openapi({ example: 15 }),
    deliveryTbilisiTime: z.string().openapi({ example: "1-2 სამუშაო დღე" }),
    deliveryRegionsPrice: z.number().nonnegative().openapi({ example: 25 }),
    deliveryRegionsTime: z.string().openapi({ example: "3-5 სამუშაო დღე" }),
    deliveryExpressPrice: z.number().nonnegative().openapi({ example: 40 }),
    deliveryExpressTime: z.string().openapi({ example: "2-4 საათი" }),
    fraudVelocityOrderCount: z.int().positive().openapi({ example: 3 }),
    fraudVelocityWindowMinutes: z.int().positive().openapi({ example: 30 }),
    fraudNewAccountWindowHours: z.int().positive().openapi({ example: 24 }),
    fraudHighValueThreshold: z.number().nonnegative().openapi({ example: 1000 }),
    fraudFailedLoginThreshold: z.int().positive().max(100).openapi({ example: 5 }),
    fraudFailedLoginWindowMinutes: z.int().positive().openapi({ example: 15 }),
    finaWebCustomerId: z.int().positive().nullable().openapi({ example: null }),
    finaWebUserId: z.int().positive().nullable().openapi({ example: null }),
    cartMaxQuantity: z.int().positive().openapi({ example: 99 }),
    compareMaxItems: z.int().positive().openapi({ example: 4 }),
    analyticsDefaultWindowDays: z.int().positive().openapi({ example: 30 }),
    dashboardDemandCandidateLimit: z.int().positive().openapi({ example: 10 }),
    dashboardRecentCancelledLimit: z.int().positive().openapi({ example: 10 }),
    dashboardRecentOrdersLimit: z.int().positive().openapi({ example: 8 }),
    dashboardLowStockLimit: z.int().positive().openapi({ example: 8 }),
    dashboardRecentActivityWindowDays: z.int().positive().openapi({ example: 30 }),
    lowStockThreshold: z.int().positive().openapi({ example: 3 }),
    searchResultCap: z.int().positive().openapi({ example: 500 }),
    salesSummaryLimit: z.int().positive().openapi({ example: 10 }),
    recommendationsDefaultLimit: z.int().positive().openapi({ example: 10 }),
    recommendationsCacheTtlMinutes: z.int().positive().openapi({ example: 5 }),
    recommendationOrderWeight: z.number().nonnegative().openapi({ example: 2 }),
    recommendationWishlistWeight: z.number().nonnegative().openapi({ example: 1 }),
    recommendationViewWeight: z.number().nonnegative().openapi({ example: 0.5 }),
    recentlyViewedLimit: z.int().positive().openapi({ example: 10 }),
    sessionIdleTtlMinutes: z.int().positive().max(10080).openapi({ example: 120 }),
    sessionAbsoluteTtlDays: z.int().positive().max(365).openapi({ example: 30 }),
    // Same reasoning as the session TTLs above — an unbounded value would
    // let a password-reset or email-verification link stay valid
    // indefinitely if it ever leaked (a forwarded email, a shared inbox),
    // defeating the whole point of it expiring. A day for a reset link and
    // a week for a verification link are already far looser than any
    // legitimate configuration.
    resetTokenTtlMinutes: z.int().positive().max(1440).openapi({ example: 60 }),
    verificationTokenTtlHours: z.int().positive().max(168).openapi({ example: 24 }),
    guestIdCookieMaxAgeDays: z.int().positive().openapi({ example: 365 }),
    imageMaxDimensionPx: z.int().positive().openapi({ example: 1600 }),
    imageWebpQuality: z.int().min(1).max(100).openapi({ example: 82 }),
    finaSyncIntervalMinutes: z.int().positive().openapi({ example: 15 }),
    homepageCacheTtlMinutes: z.int().positive().openapi({ example: 5 }),
  }),
);

// Deliberately just the two fields a guest-facing form needs to decide
// whether to show the "fill via VIN" button — not the full admin Settings
// resource (which stays admin-only; the admin controls this feature via the
// settings page, this just lets the public read the resulting flag).
export const vinDecodeStatusResponseSchema = registry.register(
  "VinDecodeStatus",
  z.object({
    enabled: z.boolean().openapi({ example: false }),
    provider: vinDecodeProviderSchema.openapi({ example: "nhtsa" }),
  }),
);

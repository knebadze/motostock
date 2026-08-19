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
    fraudFailedLoginThreshold: z.int().positive().openapi({ example: 5 }),
    fraudFailedLoginWindowMinutes: z.int().positive().openapi({ example: 15 }),
    finaWebCustomerId: z.int().positive().nullable().openapi({ example: null }),
    finaWebUserId: z.int().positive().nullable().openapi({ example: null }),
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
    fraudFailedLoginThreshold: z.int().positive().openapi({ example: 5 }),
    fraudFailedLoginWindowMinutes: z.int().positive().openapi({ example: 15 }),
    finaWebCustomerId: z.int().positive().nullable().openapi({ example: null }),
    finaWebUserId: z.int().positive().nullable().openapi({ example: null }),
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

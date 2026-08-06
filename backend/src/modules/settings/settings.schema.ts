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

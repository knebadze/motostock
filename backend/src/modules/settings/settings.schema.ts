import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const updateSettingsSchema = registry.register(
  "UpdateSettingsInput",
  z.object({
    useCloudStorage: z.boolean().openapi({ example: true }),
  }),
);
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const settingsResponseSchema = registry.register(
  "Settings",
  z.object({
    useCloudStorage: z.boolean().openapi({ example: false }),
  }),
);

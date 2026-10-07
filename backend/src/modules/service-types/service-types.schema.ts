import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { MAX_DECIMAL_10_2 } from "../../lib/money.js";

export const createServiceTypeSchema = registry.register(
  "CreateServiceTypeInput",
  z.object({
    name: localizedStringSchema,
    hasPositionOption: z.boolean().optional(),
    hasFilterOption: z.boolean().optional(),
    defaultPrice: z.coerce
      .number()
      .nonnegative()
      .max(MAX_DECIMAL_10_2)
      .nullable()
      .optional()
      .openapi({ example: 45 }),
    isActive: z.boolean().optional(),
  }),
);
export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>;

// The storefront /service page's list — names only. defaultPrice is a
// workshop-internal pre-fill for logging a job, not a published price, and
// the position/filter flags are logging details.
export const publicServiceTypeResponseSchema = registry.register(
  "PublicServiceType",
  z.object({
    id: z.int(),
    name: localizedStringSchema,
  }),
);

export const updateServiceTypeSchema = registry.register(
  "UpdateServiceTypeInput",
  createServiceTypeSchema.partial(),
);
export type UpdateServiceTypeInput = z.infer<typeof updateServiceTypeSchema>;

export const serviceTypeIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const reorderServiceTypesSchema = registry.register(
  "ReorderServiceTypesInput",
  z.object({
    ids: z.array(z.int().positive()).min(1),
  }),
);
export type ReorderServiceTypesInput = z.infer<typeof reorderServiceTypesSchema>;

export const serviceTypeResponseSchema = registry.register(
  "ServiceType",
  z.object({
    id: z.int().openapi({ example: 1 }),
    name: localizedStringSchema,
    hasPositionOption: z.boolean(),
    hasFilterOption: z.boolean(),
    defaultPrice: z.number().nullable(),
    isActive: z.boolean(),
    sortOrder: z.int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

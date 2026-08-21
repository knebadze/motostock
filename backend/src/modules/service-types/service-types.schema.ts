import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const createServiceTypeSchema = registry.register(
  "CreateServiceTypeInput",
  z.object({
    name: localizedStringSchema,
    hasPositionOption: z.boolean().optional(),
    hasFilterOption: z.boolean().optional(),
    defaultPrice: z.coerce.number().nonnegative().nullable().optional().openapi({ example: 45 }),
    isActive: z.boolean().optional(),
  }),
);
export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>;

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

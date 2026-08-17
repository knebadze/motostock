import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const createFaqSchema = registry.register(
  "CreateFaqInput",
  z.object({
    question: localizedStringSchema,
    answer: localizedStringSchema,
    isActive: z.boolean().optional(),
  }),
);
export type CreateFaqInput = z.infer<typeof createFaqSchema>;

export const updateFaqSchema = registry.register("UpdateFaqInput", createFaqSchema.partial());
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;

export const faqIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const reorderFaqSchema = registry.register(
  "ReorderFaqInput",
  z.object({
    ids: z.array(z.int().positive()).min(1),
  }),
);
export type ReorderFaqInput = z.infer<typeof reorderFaqSchema>;

export const faqResponseSchema = registry.register(
  "Faq",
  z.object({
    id: z.int().openapi({ example: 1 }),
    question: localizedStringSchema,
    answer: localizedStringSchema,
    isActive: z.boolean(),
    sortOrder: z.int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

// Same slug validation as brands.schema.ts's slugField — lowercase latin,
// digits, single hyphens between segments.
const slugField = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი")
  .openapi({ example: "warehouse-manager" });

export const createVacancySchema = registry.register(
  "CreateVacancyInput",
  z.object({
    title: localizedStringSchema,
    description: localizedStringSchema,
    slug: slugField,
    isActive: z.boolean().optional(),
  }),
);
export type CreateVacancyInput = z.infer<typeof createVacancySchema>;

export const updateVacancySchema = registry.register(
  "UpdateVacancyInput",
  createVacancySchema.partial(),
);
export type UpdateVacancyInput = z.infer<typeof updateVacancySchema>;

export const vacancyIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const vacancySlugParamSchema = z.object({
  slug: z.string().min(1),
});

export const vacancyResponseSchema = registry.register(
  "Vacancy",
  z.object({
    id: z.int().openapi({ example: 1 }),
    title: localizedStringSchema,
    description: localizedStringSchema,
    slug: z.string().openapi({ example: "warehouse-manager" }),
    isActive: z.boolean(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

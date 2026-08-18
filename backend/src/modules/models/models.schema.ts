import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

const slugField = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი")
  .openapi({ example: "cbr600rr" });

const nameField = z.string().min(1).max(120).openapi({ example: "CBR600RR" });

export const createModelSchema = registry.register(
  "CreateModelInput",
  z.object({
    brandId: z.int().positive(),
    categoryId: z.int().positive(),
    name: nameField,
    slug: slugField,
  }),
);
export type CreateModelInput = z.infer<typeof createModelSchema>;

export const updateModelSchema = registry.register(
  "UpdateModelInput",
  createModelSchema.partial(),
);
export type UpdateModelInput = z.infer<typeof updateModelSchema>;

export const modelIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const modelListQuerySchema = z.object({
  brandId: z.coerce.number().int().positive().optional(),
});

export const modelResponseSchema = registry.register(
  "Model",
  z.object({
    id: z.int().openapi({ example: 1 }),
    brandId: z.int(),
    brand: z.object({ id: z.int(), name: z.string(), slug: z.string() }),
    categoryId: z.int(),
    category: z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() }),
    name: nameField,
    slug: z.string().openapi({ example: "cbr600rr" }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

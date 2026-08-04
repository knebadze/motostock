import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

const abbreviationSchema = localizedStringSchema.openapi({
  example: { ka: "სმ", en: "cm", ru: "см" },
});

export const createUnitSchema = registry.register(
  "CreateUnitInput",
  z.object({
    name: localizedStringSchema.openapi({
      example: { ka: "სანტიმეტრი", en: "Centimeter", ru: "Сантиметр" },
    }),
    abbreviation: abbreviationSchema,
  }),
);
export type CreateUnitInput = z.infer<typeof createUnitSchema>;

export const updateUnitSchema = registry.register("UpdateUnitInput", createUnitSchema.partial());
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export const unitIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const unitResponseSchema = registry.register(
  "Unit",
  z.object({
    id: z.int().openapi({ example: 1 }),
    name: localizedStringSchema,
    abbreviation: localizedStringSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";

export const heroSlideTypeSchema = z.enum([
  "CTA",
  "VEHICLE_SEARCH",
  "INFO",
  "CATEGORY_FILTER",
  "DISCOUNT",
]);
export type HeroSlideTypeInput = z.infer<typeof heroSlideTypeSchema>;

export const heroSlideTextPositionSchema = z.enum(["LEFT", "CENTER", "RIGHT"]);
export type HeroSlideTextPositionInput = z.infer<typeof heroSlideTextPositionSchema>;

export const heroSlideVerticalPositionSchema = z.enum(["TOP", "MIDDLE", "BOTTOM"]);
export type HeroSlideVerticalPositionInput = z.infer<typeof heroSlideVerticalPositionSchema>;

// Character limits keep the slide's text block from overflowing/wrapping
// awkwardly over the background image — enforced here (not just in the
// frontend form) so the constraint holds regardless of client.
const titleFieldSchema = z.object({
  ka: z.string().trim().min(1).max(60),
  en: z.string().trim().min(1).max(60),
  ru: z.string().trim().min(1).max(60),
});
const subtitleFieldSchema = z.object({
  ka: z.string().trim().min(1).max(120),
  en: z.string().trim().min(1).max(120),
  ru: z.string().trim().min(1).max(120),
});
const buttonLabelFieldSchema = z.object({
  ka: z.string().trim().min(1).max(30),
  en: z.string().trim().min(1).max(30),
  ru: z.string().trim().min(1).max(30),
});

export const createHeroSlideSchema = registry.register(
  "CreateHeroSlideInput",
  z.object({
    type: heroSlideTypeSchema,
    title: titleFieldSchema.openapi({
      example: { ka: "მოძებნე ნაწილები შენი ტრანსპორტის მიხედვით", en: "Find parts for your vehicle", ru: "Найдите запчасти для вашей техники" },
    }),
    subtitle: subtitleFieldSchema.nullable().optional(),
    // CTA and DISCOUNT only — required by the service layer for those two
    // types, ignored/cleared for every other slide type.
    buttonLabel: buttonLabelFieldSchema.nullable().optional(),
    // CTA-only — free-typed link. DISCOUNT's link is always computed, never
    // stored here.
    buttonLink: z.string().max(500).nullable().optional(),
    // DISCOUNT-only — both optional; neither set means "general discount
    // page" (/shop?onSale=true).
    discountCategoryId: z.int().positive().nullable().optional(),
    discountProductBrandId: z.int().positive().nullable().optional(),
    textPosition: heroSlideTextPositionSchema.optional(),
    verticalPosition: heroSlideVerticalPositionSchema.optional(),
    isActive: z.boolean().optional(),
  }),
);
export type CreateHeroSlideInput = z.infer<typeof createHeroSlideSchema>;

export const updateHeroSlideSchema = registry.register(
  "UpdateHeroSlideInput",
  createHeroSlideSchema.partial(),
);
export type UpdateHeroSlideInput = z.infer<typeof updateHeroSlideSchema>;

export const heroSlideIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const reorderHeroSlidesSchema = registry.register(
  "ReorderHeroSlidesInput",
  z.object({
    ids: z.array(z.int().positive()).min(1),
  }),
);
export type ReorderHeroSlidesInput = z.infer<typeof reorderHeroSlidesSchema>;

export const heroSlideResponseSchema = registry.register(
  "HeroSlide",
  z.object({
    id: z.int().openapi({ example: 1 }),
    type: heroSlideTypeSchema,
    title: localizedStringSchema,
    subtitle: localizedStringSchema.nullable(),
    imageUrl: z.string().nullable(),
    buttonLabel: localizedStringSchema.nullable(),
    buttonLink: z.string().nullable(),
    discountCategoryId: z.int().nullable(),
    discountProductBrandId: z.int().nullable(),
    textPosition: heroSlideTextPositionSchema,
    verticalPosition: heroSlideVerticalPositionSchema,
    isActive: z.boolean(),
    sortOrder: z.int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

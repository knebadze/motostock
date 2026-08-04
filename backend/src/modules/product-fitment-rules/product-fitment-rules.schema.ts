import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

export const productFitmentRuleProductIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export const productFitmentRuleIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

const productFitmentRuleTypeSchema = z.enum(["CATEGORY", "SPEC", "ALL"]);
export type ProductFitmentRuleTypeInput = z.infer<typeof productFitmentRuleTypeSchema>;

// Kept in sync with vehicle-category-filters' VEHICLE_SPEC_FIELDS registry —
// only the LOOKUP-kind fields make sense for a fitment rule (a "this spec
// equals that value" match), not open-ended NUMBER/BOOLEAN ranges.
const vehicleSpecFieldSchema = z.enum([
  "FUEL_TYPE",
  "TRANSMISSION_TYPE",
  "COOLING_TYPE",
  "FINAL_DRIVE_TYPE",
  "DRIVE_TYPE",
  "START_TYPE",
  "POWERTRAIN_TYPE",
]);
export type VehicleSpecFieldInput = z.infer<typeof vehicleSpecFieldSchema>;

function assertShapeMatchesType(
  data: {
    type: ProductFitmentRuleTypeInput;
    categoryId?: number | null;
    specField?: VehicleSpecFieldInput | null;
    specLookupItemId?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  if (data.type === "CATEGORY" && data.categoryId == null) {
    ctx.addIssue({ code: "custom", message: "categoryId სავალდებულოა", path: ["categoryId"] });
  }
  if (data.type !== "CATEGORY" && data.categoryId != null) {
    ctx.addIssue({
      code: "custom",
      message: "categoryId მხოლოდ CATEGORY ტიპისთვისაა",
      path: ["categoryId"],
    });
  }
  if (data.type === "SPEC" && (data.specField == null || data.specLookupItemId == null)) {
    ctx.addIssue({
      code: "custom",
      message: "specField და specLookupItemId სავალდებულოა",
      path: ["specField"],
    });
  }
  if (data.type !== "SPEC" && (data.specField != null || data.specLookupItemId != null)) {
    ctx.addIssue({
      code: "custom",
      message: "specField/specLookupItemId მხოლოდ SPEC ტიპისთვისაა",
      path: ["specField"],
    });
  }
}

export const createProductFitmentRuleSchema = registry.register(
  "CreateProductFitmentRuleInput",
  z
    .object({
      type: productFitmentRuleTypeSchema,
      categoryId: z.int().positive().nullable().optional(),
      specField: vehicleSpecFieldSchema.nullable().optional(),
      specLookupItemId: z.int().positive().nullable().optional(),
    })
    .superRefine(assertShapeMatchesType),
);
export type CreateProductFitmentRuleInput = z.infer<typeof createProductFitmentRuleSchema>;

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });

export const productFitmentRuleResponseSchema = registry.register(
  "ProductFitmentRule",
  z.object({
    id: z.int().openapi({ example: 1 }),
    productId: z.int(),
    type: productFitmentRuleTypeSchema,
    category: namedRefSchema.nullable(),
    specField: vehicleSpecFieldSchema.nullable(),
    specFieldLabel: localizedStringSchema.nullable(),
    specValue: lookupItemResponseSchema.nullable(),
    createdAt: z.iso.datetime(),
  }),
);

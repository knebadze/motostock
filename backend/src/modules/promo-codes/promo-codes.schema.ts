import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });

export const promoCodeDomainSchema = z.enum(["PRODUCT", "VEHICLE"]);
export type PromoCodeDomainInput = z.infer<typeof promoCodeDomainSchema>;

// Kept in sync with ProductFitmentRule/the removed VehicleListingDiscountRule
// — only the LOOKUP-kind vehicle spec fields make sense for a "this spec
// equals that value" match.
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

// Admin-typed but always normalized to uppercase before storage (see
// promo-codes.service.ts) — the format constraint just keeps codes
// short/typeable/unambiguous.
const codeSchema = z
  .string()
  .trim()
  .min(3, "მინიმუმ 3 სიმბოლო")
  .max(30, "მაქს. 30 სიმბოლო")
  .regex(/^[A-Za-z0-9_-]+$/, "მხოლოდ ლათინური ასოები, ციფრები, - და _");

const baseFields = {
  code: codeSchema,
  categoryId: z.int().positive().nullable().optional(),
  // PRODUCT domain only.
  productBrandId: z.int().positive().nullable().optional(),
  attributeId: z.int().positive().nullable().optional(),
  attributeOptionId: z.int().positive().nullable().optional(),
  // VEHICLE domain only.
  brandId: z.int().positive().nullable().optional(),
  modelId: z.int().positive().nullable().optional(),
  specField: vehicleSpecFieldSchema.nullable().optional(),
  specLookupItemId: z.int().positive().nullable().optional(),
  discountPercent: z.coerce.number().positive().max(100).openapi({ example: 15 }),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  isActive: z.boolean().optional(),
};

function assertShapeMatchesDomain(
  data: {
    domain: PromoCodeDomainInput;
    productBrandId?: number | null;
    attributeId?: number | null;
    attributeOptionId?: number | null;
    categoryId?: number | null;
    brandId?: number | null;
    modelId?: number | null;
    specField?: VehicleSpecFieldInput | null;
    specLookupItemId?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  if ((data.attributeId == null) !== (data.attributeOptionId == null)) {
    ctx.addIssue({
      code: "custom",
      message: "attributeId და attributeOptionId ერთად არის საჭირო",
      path: ["attributeOptionId"],
    });
  }
  if ((data.specField == null) !== (data.specLookupItemId == null)) {
    ctx.addIssue({
      code: "custom",
      message: "specField და specLookupItemId ერთად არის საჭირო",
      path: ["specLookupItemId"],
    });
  }

  if (data.domain === "PRODUCT") {
    if (data.brandId != null || data.modelId != null || data.specField != null || data.specLookupItemId != null) {
      ctx.addIssue({
        code: "custom",
        message: "brandId/modelId/specField მხოლოდ ტრანსპორტისთვისაა",
        path: ["domain"],
      });
    }
    if ((data.attributeId != null || data.attributeOptionId != null) && data.categoryId == null) {
      ctx.addIssue({
        code: "custom",
        message: "მახასიათებლის მითითებისთვის საჭიროა კატეგორიაც",
        path: ["categoryId"],
      });
    }
  } else {
    if (data.productBrandId != null || data.attributeId != null || data.attributeOptionId != null) {
      ctx.addIssue({
        code: "custom",
        message: "productBrandId/attributeId მხოლოდ პროდუქტისთვისაა",
        path: ["domain"],
      });
    }
    if (data.modelId != null && data.categoryId == null) {
      ctx.addIssue({
        code: "custom",
        message: "მოდელის მითითებისთვის საჭიროა კატეგორიაც",
        path: ["categoryId"],
      });
    }
  }
}

export const createPromoCodeSchema = registry.register(
  "CreatePromoCodeInput",
  z
    .object({ domain: promoCodeDomainSchema, ...baseFields })
    .superRefine((data, ctx) => {
      assertShapeMatchesDomain(data, ctx);
      if (new Date(data.startDate) >= new Date(data.endDate)) {
        ctx.addIssue({
          code: "custom",
          message: "დაწყების თარიღი დასრულების თარიღზე ადრე უნდა იყოს",
          path: ["endDate"],
        });
      }
    }),
);
export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;

// domain is fixed at creation — not offered as an editable field, so the
// edit modal never needs to re-validate a domain switch mid-flight.
export const updatePromoCodeSchema = registry.register(
  "UpdatePromoCodeInput",
  z
    .object({
      code: codeSchema.optional(),
      categoryId: z.int().positive().nullable().optional(),
      productBrandId: z.int().positive().nullable().optional(),
      attributeId: z.int().positive().nullable().optional(),
      attributeOptionId: z.int().positive().nullable().optional(),
      brandId: z.int().positive().nullable().optional(),
      modelId: z.int().positive().nullable().optional(),
      specField: vehicleSpecFieldSchema.nullable().optional(),
      specLookupItemId: z.int().positive().nullable().optional(),
      discountPercent: z.coerce.number().positive().max(100).optional(),
      startDate: z.iso.date().optional(),
      endDate: z.iso.date().optional(),
      isActive: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      if ((data.attributeId == null) !== (data.attributeOptionId == null)) {
        ctx.addIssue({
          code: "custom",
          message: "attributeId და attributeOptionId ერთად არის საჭირო",
          path: ["attributeOptionId"],
        });
      }
      if ((data.specField == null) !== (data.specLookupItemId == null)) {
        ctx.addIssue({
          code: "custom",
          message: "specField და specLookupItemId ერთად არის საჭირო",
          path: ["specLookupItemId"],
        });
      }
    }),
);
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;

export const promoCodeIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const statusFilterSchema = z.enum(["active", "history"]);

export const listPromoCodesQuerySchema = z.object({
  domain: promoCodeDomainSchema,
  status: statusFilterSchema.optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(60).optional(),
});
export type ListPromoCodesQuery = z.infer<typeof listPromoCodesQuerySchema>;

export const promoCodeResponseSchema = registry.register(
  "PromoCode",
  z.object({
    id: z.int().openapi({ example: 1 }),
    code: z.string().openapi({ example: "SUMMER15" }),
    domain: promoCodeDomainSchema,
    category: namedRefSchema.nullable(),
    productBrand: namedRefSchema.nullable(),
    attribute: z.object({ id: z.int(), name: localizedStringSchema }).nullable(),
    attributeOption: z.object({ id: z.int(), key: z.string(), label: localizedStringSchema }).nullable(),
    brand: namedRefSchema.nullable(),
    model: namedRefSchema.nullable(),
    specField: vehicleSpecFieldSchema.nullable(),
    specFieldLabel: localizedStringSchema.nullable(),
    specValue: lookupItemResponseSchema.nullable(),
    discountPercent: z.number().openapi({ example: 15 }),
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
    isActive: z.boolean(),
    computedStatus: z.enum(["ACTIVE", "SCHEDULED", "EXPIRED", "DISABLED"]),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { attributeValueTypeSchema } from "../attributes/attributes.schema.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });

export const bulkDiscountCandidatesQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});
export type BulkDiscountCandidatesQuery = z.infer<typeof bulkDiscountCandidatesQuerySchema>;

export const bulkApplyProductDiscountsSchema = registry.register(
  "BulkApplyProductDiscountsInput",
  z
    .object({
      variantIds: z.array(z.int().positive()).min(1),
      discountPercent: z.coerce.number().positive().max(100).openapi({ example: 15 }),
      startDate: z.iso.date(),
      endDate: z.iso.date(),
    })
    .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
      message: "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ",
      path: ["endDate"],
    }),
);
export type BulkApplyProductDiscountsInput = z.infer<typeof bulkApplyProductDiscountsSchema>;

const candidateAttributeValueSchema = z.object({
  attributeId: z.int(),
  attributeName: localizedStringSchema,
  valueType: attributeValueTypeSchema,
  valueText: z.string().nullable(),
  valueNumber: z.number().nullable(),
  valueBoolean: z.boolean().nullable(),
  option: z.object({ id: z.int(), key: z.string(), label: localizedStringSchema }).nullable(),
});

// ?status=active — only rows currently within [startDate, endDate];
// ?status=history — everything else (scheduled or expired). Omitted = no
// status filtering (everything). A ProductVariantDiscount has no isActive
// flag of its own — "disabling" one just means deleting it.
const statusFilterSchema = z.enum(["active", "history"]);

export const listProductDiscountHistoryQuerySchema = z.object({
  status: statusFilterSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
});
export type ListProductDiscountHistoryQuery = z.infer<typeof listProductDiscountHistoryQuerySchema>;

export const productDiscountHistoryRowSchema = registry.register(
  "ProductDiscountHistoryRow",
  z.object({
    id: z.int(),
    variantId: z.int(),
    productId: z.int(),
    productName: localizedStringSchema,
    productSlug: z.string(),
    brand: namedRefSchema.nullable(),
    sku: z.string().nullable(),
    size: lookupItemResponseSchema.nullable(),
    color: lookupItemResponseSchema.nullable(),
    price: z.number(),
    discountPrice: z.number(),
    discountPercent: z.number().nullable(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    computedStatus: z.enum(["ACTIVE", "SCHEDULED", "EXPIRED"]),
    createdAt: z.iso.datetime(),
  }),
);

export const bulkDiscountCandidateResponseSchema = registry.register(
  "BulkDiscountCandidate",
  z.object({
    variantId: z.int(),
    productId: z.int(),
    productName: localizedStringSchema,
    productSlug: z.string(),
    brand: namedRefSchema.nullable(),
    attributeValues: z.array(candidateAttributeValueSchema),
    sku: z.string().nullable(),
    size: lookupItemResponseSchema.nullable(),
    color: lookupItemResponseSchema.nullable(),
    price: z.number().openapi({ example: 199.99 }),
    // A currently-active direct discount on this variant, if any — so the
    // admin sees (before applying a new bulk discount) which candidates
    // already have their own, and at what percent/dates.
    activeDiscount: z
      .object({ discountPercent: z.number().nullable(), startDate: z.iso.datetime(), endDate: z.iso.datetime() })
      .nullable(),
  }),
);

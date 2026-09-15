import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { attributeValueTypeSchema } from "../attributes/attributes.schema.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";
import {
  bulkDiscountEventInputSchema,
  bulkDiscountEventTargetTypeSchema,
} from "../bulk-discount-events/bulk-discount-events.schema.js";

export { bulkDiscountEventTargetTypeSchema as bulkDiscountTargetTypeSchema };

const brandModelRefSchema = z.object({ id: z.int(), name: z.string(), slug: z.string() });

// One module for both PRODUCT and VEHICLE_LISTING bulk discounts — the
// apply/date/event-grouping mechanics are identical between the two
// (see bulk-discounts.service.ts), only the candidate/history row shapes
// genuinely differ (product variants vs vehicle listings), so those keep
// their own schemas below rather than being forced into one shape.
export const bulkDiscountCandidatesQuerySchema = z.object({
  targetType: bulkDiscountEventTargetTypeSchema,
  categoryId: z.coerce.number().int().positive(),
});
export type BulkDiscountCandidatesQuery = z.infer<typeof bulkDiscountCandidatesQuerySchema>;

export const bulkApplyDiscountsSchema = registry.register(
  "BulkApplyDiscountsInput",
  z
    .object({
      targetType: bulkDiscountEventTargetTypeSchema,
      itemIds: z.array(z.int().positive()).min(1),
      // 100 (or above) rejected, not just capped — applyBulkDiscounts derives
      // discountPrice directly from this percent (price * (1 - percent/100)),
      // so a stray 100 zeroes out every one of the (potentially many)
      // selected items at once.
      discountPercent: z.coerce.number().positive().max(99).openapi({ example: 15 }),
      startDate: z.iso.date(),
      endDate: z.iso.date(),
      // Optional — grouping this batch under a named BulkDiscountEvent is
      // opt-in, never required (see bulk-discount-events.schema.ts's own
      // comment). Omitted entirely, every row is created exactly as before
      // this field existed.
      event: bulkDiscountEventInputSchema.optional(),
    })
    .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
      message: "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ",
      path: ["endDate"],
    }),
);
export type BulkApplyDiscountsInput = z.infer<typeof bulkApplyDiscountsSchema>;

// ---- PRODUCT candidates/history ----

const candidateAttributeValueSchema = z.object({
  attributeId: z.int(),
  attributeName: localizedStringSchema,
  valueType: attributeValueTypeSchema,
  valueText: z.string().nullable(),
  valueNumber: z.number().nullable(),
  valueBoolean: z.boolean().nullable(),
  option: z.object({ id: z.int(), key: z.string(), label: localizedStringSchema }).nullable(),
});

export const bulkDiscountCandidateResponseSchema = registry.register(
  "BulkDiscountCandidate",
  z.object({
    variantId: z.int(),
    productId: z.int(),
    productName: localizedStringSchema,
    productSlug: z.string(),
    brand: brandModelRefSchema.nullable(),
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

export const productDiscountHistoryRowSchema = registry.register(
  "ProductDiscountHistoryRow",
  z.object({
    id: z.int(),
    variantId: z.int(),
    productId: z.int(),
    productName: localizedStringSchema,
    productSlug: z.string(),
    brand: brandModelRefSchema.nullable(),
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

// ---- VEHICLE_LISTING candidates/history ----

const vehicleSpecFieldSchema = z.enum([
  "FUEL_TYPE",
  "TRANSMISSION_TYPE",
  "COOLING_TYPE",
  "FINAL_DRIVE_TYPE",
  "DRIVE_TYPE",
  "START_TYPE",
  "POWERTRAIN_TYPE",
]);

const candidateSpecValueSchema = z.object({
  field: vehicleSpecFieldSchema,
  fieldLabel: localizedStringSchema,
  value: lookupItemResponseSchema,
});

export const bulkVehicleDiscountCandidateResponseSchema = registry.register(
  "BulkVehicleDiscountCandidate",
  z.object({
    vehicleListingId: z.int(),
    brand: brandModelRefSchema,
    model: brandModelRefSchema,
    variant: z.string(),
    year: z.int(),
    condition: lookupItemResponseSchema,
    color: lookupItemResponseSchema,
    specValues: z.array(candidateSpecValueSchema),
    price: z.number().openapi({ example: 4500 }),
    activeDiscount: z
      .object({ discountPercent: z.number().nullable(), startDate: z.iso.datetime(), endDate: z.iso.datetime() })
      .nullable(),
  }),
);

export const vehicleDiscountHistoryRowSchema = registry.register(
  "VehicleDiscountHistoryRow",
  z.object({
    id: z.int(),
    vehicleListingId: z.int(),
    brand: brandModelRefSchema,
    model: brandModelRefSchema,
    variant: z.string(),
    year: z.int(),
    condition: lookupItemResponseSchema,
    color: lookupItemResponseSchema,
    price: z.number(),
    discountPrice: z.number(),
    discountPercent: z.number().nullable(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    computedStatus: z.enum(["ACTIVE", "SCHEDULED", "EXPIRED"]),
    createdAt: z.iso.datetime(),
  }),
);

// ---- history query (shared shape, either target type) ----

// ?status=active — only rows currently within [startDate, endDate];
// ?status=history — everything else (scheduled or expired). Omitted = no
// status filtering (everything). Neither discount table has an isActive
// flag of its own — "disabling" one just means deleting it.
const statusFilterSchema = z.enum(["active", "history"]);

export const listDiscountHistoryQuerySchema = z.object({
  targetType: bulkDiscountEventTargetTypeSchema,
  status: statusFilterSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
});
export type ListDiscountHistoryQuery = z.infer<typeof listDiscountHistoryQuerySchema>;

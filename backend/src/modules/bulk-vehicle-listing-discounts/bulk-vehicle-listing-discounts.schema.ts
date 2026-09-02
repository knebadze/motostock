import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

const brandModelRefSchema = z.object({ id: z.int(), name: z.string(), slug: z.string() });

export const bulkVehicleDiscountCandidatesQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});
export type BulkVehicleDiscountCandidatesQuery = z.infer<typeof bulkVehicleDiscountCandidatesQuerySchema>;

export const bulkApplyVehicleListingDiscountsSchema = registry.register(
  "BulkApplyVehicleListingDiscountsInput",
  z
    .object({
      vehicleListingIds: z.array(z.int().positive()).min(1),
      // 100 (or above) rejected, not just capped — bulk-vehicle-listing-discounts.service.ts's
      // applyPercentDiscount derives discountPrice directly from this percent
      // (price * (1 - percent/100)), so a stray 100 zeroes out every one of
      // the (potentially many) selected listings at once.
      discountPercent: z.coerce.number().positive().max(99).openapi({ example: 15 }),
      startDate: z.iso.date(),
      endDate: z.iso.date(),
    })
    .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
      message: "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ",
      path: ["endDate"],
    }),
);
export type BulkApplyVehicleListingDiscountsInput = z.infer<typeof bulkApplyVehicleListingDiscountsSchema>;

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

// ?status=active — only rows currently within [startDate, endDate];
// ?status=history — everything else (scheduled or expired).
const statusFilterSchema = z.enum(["active", "history"]);

export const listVehicleDiscountHistoryQuerySchema = z.object({
  status: statusFilterSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
});
export type ListVehicleDiscountHistoryQuery = z.infer<typeof listVehicleDiscountHistoryQuerySchema>;

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

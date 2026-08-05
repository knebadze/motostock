import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });

export const bulkVehicleDiscountCandidatesQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive(),
});
export type BulkVehicleDiscountCandidatesQuery = z.infer<typeof bulkVehicleDiscountCandidatesQuerySchema>;

export const bulkApplyVehicleListingDiscountsSchema = registry.register(
  "BulkApplyVehicleListingDiscountsInput",
  z
    .object({
      vehicleListingIds: z.array(z.int().positive()).min(1),
      discountPercent: z.coerce.number().positive().max(100).openapi({ example: 15 }),
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

export const bulkVehicleDiscountCandidateResponseSchema = registry.register(
  "BulkVehicleDiscountCandidate",
  z.object({
    vehicleListingId: z.int(),
    brand: namedRefSchema,
    model: namedRefSchema,
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

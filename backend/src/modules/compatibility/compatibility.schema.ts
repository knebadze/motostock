import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";

export const compatibilityKindFilterSchema = z.enum(["FITMENT", "RULE"]);

// page/pageSize both optional (defaults applied in the controller, not via
// zod's `.default()`) — an output key zod infers as required-but-defaulted
// breaks Express's route handler overload resolution against the default
// ParsedQs query type, same reasoning as error-logs.schema.ts.
export const listCompatibilityQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  kind: compatibilityKindFilterSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type ListCompatibilityQuery = z.infer<typeof listCompatibilityQuerySchema>;

export const compatibilityProductIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });
const brandModelRefSchema = z.object({ id: z.int(), name: z.string(), slug: z.string() });

const productRefSchema = z.object({
  id: z.int(),
  name: localizedStringSchema,
  slug: z.string(),
  category: namedRefSchema,
});

const vehicleRefSchema = z.object({
  id: z.int(),
  brand: brandModelRefSchema,
  model: brandModelRefSchema,
  variant: z.string(),
  yearFrom: z.int().nullable(),
  yearTo: z.int().nullable(),
});

// One row per ProductFitment (kind: FITMENT) or ProductFitmentRule (kind:
// RULE_ALL/RULE_CATEGORY/RULE_SPEC) — merged into a single flat shape so the
// admin table doesn't need two different row renderers. Only the field(s)
// matching `kind` are ever non-null.
export const compatibilityItemResponseSchema = registry.register(
  "CompatibilityItem",
  z.object({
    id: z.string().openapi({ example: "fitment-1" }),
    kind: z.enum(["FITMENT", "RULE_ALL", "RULE_CATEGORY", "RULE_SPEC"]),
    product: productRefSchema,
    vehicle: vehicleRefSchema.nullable(),
    category: namedRefSchema.nullable(),
    specFieldLabel: localizedStringSchema.nullable(),
    specValue: lookupItemResponseSchema.nullable(),
    createdAt: z.iso.datetime(),
  }),
);

export const compatibleVehicleResponseSchema = registry.register(
  "CompatibleVehicle",
  vehicleRefSchema,
);

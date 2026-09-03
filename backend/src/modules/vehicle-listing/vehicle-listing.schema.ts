import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";
import { vehicleListingDiscountResponseSchema } from "../vehicle-listing-discounts/vehicle-listing-discounts.schema.js";
import { vehicleListingImageResponseSchema } from "../vehicle-listing-images/vehicle-listing-images.schema.js";
import { vehicleSpecFieldSchema } from "../vehicle-category-filters/vehicle-category-filters.schema.js";
import { adminFiltersQuerySchema } from "../filters/filter-request.schema.js";

export const warrantyUnitSchema = z.enum(["YEAR", "MONTH"]);

// Both null together (no warranty advertised) or both set — never just one,
// on either create or a partial update.
function requireWarrantyPair(
  data: { warrantyValue?: number | null; warrantyUnit?: "YEAR" | "MONTH" | null },
  ctx: z.RefinementCtx,
) {
  if ((data.warrantyValue != null) !== (data.warrantyUnit != null)) {
    ctx.addIssue({
      code: "custom",
      message: "გარანტიის მითითებისას საჭიროა როგორც ვადა, ისე ერთეული (წელი/თვე)",
      path: ["warrantyUnit"],
    });
  }
}

const baseVehicleListingSchema = z.object({
  vehicleCatalogId: z.int().positive(),
  conditionId: z.int().positive(),
  statusId: z.int().positive(),
  colorId: z.int().positive(),
  year: z.int().min(1900).max(2100).openapi({ example: 2022 }),
  // Odometer reading — relevant for used units, left unset for new stock.
  mileageKm: z.int().nonnegative().nullable().optional(),
  warrantyValue: z.int().positive().nullable().optional(),
  warrantyUnit: warrantyUnitSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  price: z.coerce.number().positive().openapi({ example: 4500 }),
  // nonnegative, not positive — 0 is a legitimate value (out of stock,
  // sold out but the listing kept for reference), same as mileageKm above.
  stockQuantity: z.int().nonnegative().optional(),
  descriptionKa: z.string().max(20000).nullable().optional(),
  descriptionEn: z.string().max(20000).nullable().optional(),
  descriptionRu: z.string().max(20000).nullable().optional(),
});

export const createVehicleListingSchema = registry.register(
  "CreateVehicleListingInput",
  baseVehicleListingSchema.superRefine(requireWarrantyPair),
);
export type CreateVehicleListingInput = z.infer<typeof createVehicleListingSchema>;

export const updateVehicleListingSchema = registry.register(
  "UpdateVehicleListingInput",
  baseVehicleListingSchema.partial().superRefine(requireWarrantyPair),
);
export type UpdateVehicleListingInput = z.infer<typeof updateVehicleListingSchema>;

export const vehicleListingIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const specFilterSchema = z.object({
  lookupFilters: z
    .array(z.object({ field: vehicleSpecFieldSchema, ids: z.array(z.int().positive()).min(1) }))
    .optional(),
  numberRanges: z
    .array(
      z.object({
        field: vehicleSpecFieldSchema,
        min: z.number().optional(),
        max: z.number().optional(),
      }),
    )
    .optional(),
  booleanFields: z.array(vehicleSpecFieldSchema).optional(),
});
export type SpecFilterInput = z.infer<typeof specFilterSchema>;

// ?brandIds=1&brandIds=2 parses to a string[] via qs, but a single
// ?brandIds=1 parses to a bare string — normalize both into an array before
// coercing each entry to a number.
const brandIdsQuerySchema = z
  .preprocess(
    (value) => (value == null ? undefined : Array.isArray(value) ? value : [value]),
    z.array(z.coerce.number().int().positive()),
  )
  .optional();

export const vehicleListingListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  brandIds: brandIdsQuerySchema,
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().nonnegative().optional(),
  yearMin: z.coerce.number().int().optional(),
  yearMax: z.coerce.number().int().optional(),
  // Homepage "discounted vehicles" slider — narrows to listings with at
  // least one currently active discount.
  onSale: z.coerce.boolean().optional(),
  // Homepage sliders cap how many listings they pull — optional everywhere
  // else.
  limit: z.coerce.number().int().positive().max(50).optional(),
  // URL-encoded JSON rather than ad-hoc flat query keys — keeps the shape
  // extensible and lets it be validated as one nested object, same pattern
  // as products' attributeFilters.
  specFilters: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "specFilters არასწორი JSON-ია" });
        return z.NEVER;
      }
      const result = specFilterSchema.safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: "custom", message: "specFilters არასწორი ფორმატია" });
        return z.NEVER;
      }
      return result.data;
    })
    .optional(),
  // Admin-only "filter everything" panel — separate from the shop-facing
  // params above, additive, never required. See
  // filters/vehicle-listing/vehicle-listing-admin-filter-registry.ts.
  adminFilters: adminFiltersQuerySchema,
  // Admin-list server-side pagination (only meaningful alongside
  // adminFilters — the storefront path uses `limit` above instead). Both
  // optional, no `.default()` — same reasoning as specFilters' trailing
  // `.optional()` above (Express route handler overload resolution).
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  // Storefront shop page sort — only meaningful alongside page/pageSize (see
  // vehicle-listing.service.ts's listVehicleListings); defaults to
  // newest-first.
  sortBy: z.enum(["newest", "year-desc", "price-asc", "price-desc"]).optional(),
});
export type VehicleListingListQuery = z.infer<typeof vehicleListingListQuerySchema>;

// Homepage "popular vehicles" slider — ranked by total sold quantity
// (Order/OrderItem), see vehicle-listing.service.ts's listPopularVehicleListings.
export const popularVehicleListingsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});
export type PopularVehicleListingsQuery = z.infer<typeof popularVehicleListingsQuerySchema>;

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });
const brandModelRefSchema = z.object({ id: z.int(), name: z.string(), slug: z.string() });

export const vehicleListingResponseSchema = registry.register(
  "VehicleListing",
  z.object({
    id: z.int().openapi({ example: 1 }),
    vehicleCatalog: z.object({
      id: z.int(),
      category: namedRefSchema,
      brand: brandModelRefSchema,
      model: brandModelRefSchema,
      variant: z.string(),
      yearFrom: z.int().nullable(),
      yearTo: z.int().nullable(),
      engineVolumeCc: z.int().nullable(),
      enginePowerHp: z.int().nullable(),
      cylinderCount: z.int().nullable(),
      gearCount: z.int().nullable(),
      seatCount: z.int().nullable(),
      weightKg: z.int().nullable(),
      seatHeightMm: z.int().nullable(),
      fuelTankLiters: z.number().nullable(),
      topSpeedKmh: z.int().nullable(),
      hasAbs: z.boolean().nullable(),
      fuelType: lookupItemResponseSchema.nullable(),
      transmissionType: lookupItemResponseSchema.nullable(),
      coolingType: lookupItemResponseSchema.nullable(),
      finalDriveType: lookupItemResponseSchema.nullable(),
      driveType: lookupItemResponseSchema.nullable(),
      startType: lookupItemResponseSchema.nullable(),
      powertrainType: lookupItemResponseSchema.nullable(),
      motorPowerWatt: z.int().nullable(),
      batteryCapacityWh: z.int().nullable(),
      rangeKm: z.int().nullable(),
      chargingTimeMinutes: z.int().nullable(),
      hasLockingDifferential: z.boolean().nullable(),
      descriptionKa: z.string().nullable(),
      descriptionEn: z.string().nullable(),
      descriptionRu: z.string().nullable(),
      imageUrl: z.string().nullable(),
    }),
    condition: lookupItemResponseSchema,
    status: lookupItemResponseSchema,
    color: lookupItemResponseSchema,
    year: z.int(),
    mileageKm: z.int().nullable(),
    warrantyValue: z.int().nullable(),
    warrantyUnit: warrantyUnitSchema.nullable(),
    isActive: z.boolean(),
    price: z.number().openapi({ example: 4500 }),
    stockQuantity: z.int(),
    descriptionKa: z.string().nullable(),
    descriptionEn: z.string().nullable(),
    descriptionRu: z.string().nullable(),
    images: z.array(vehicleListingImageResponseSchema),
    discounts: z.array(vehicleListingDiscountResponseSchema),
    // Narrower than a full VehicleListingDiscount row on purpose — this may
    // be derived from a VehicleListingDiscountRule (no real DB row/id/dates
    // of its own), and no consumer reads anything but discountPrice here
    // (the crossed-out original price always comes from the listing's own
    // `price`).
    activeDiscount: z.object({ discountPrice: z.number().openapi({ example: 3999 }) }).nullable(),
    viewCount: z.int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

const vehicleListingSaleOrderSchema = z.object({
  orderId: z.int(),
  orderCode: z.string(),
  createdAt: z.iso.datetime(),
  buyerName: z.string(),
  buyerEmail: z.string(),
  quantity: z.int(),
  lineTotal: z.number(),
  status: z.string(),
});

const vehicleListingSalesSummarySchema = z.object({
  totalQuantitySold: z.int(),
  totalRevenue: z.number(),
  orderCount: z.int(),
  recentOrders: z.array(vehicleListingSaleOrderSchema),
});

// Admin-only counterpart to vehicleListingResponseSchema — adds sales
// history, which the public endpoint has no reason to expose.
export const vehicleListingDetailAdminResponseSchema = registry.register(
  "VehicleListingDetailAdmin",
  vehicleListingResponseSchema.extend({
    sales: vehicleListingSalesSummarySchema,
  }),
);

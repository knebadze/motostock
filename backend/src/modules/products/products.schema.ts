import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { attributeValueTypeSchema } from "../attributes/attributes.schema.js";
import { adminFiltersQuerySchema } from "../filters/filter-request.schema.js";
import { lookupItemResponseSchema } from "../lookups/lookups.schema.js";
import { productVariantDiscountResponseSchema } from "../product-variant-discounts/product-variant-discounts.schema.js";
import { productVariantImageResponseSchema } from "../product-variant-images/product-variant-images.schema.js";

const optionalDescription = z.string().max(20000).nullable().optional();

const slugField = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი")
  .openapi({ example: "agv-k6-helmet" });

export const productAttributeValueInputSchema = z.object({
  attributeId: z.int().positive(),
  valueText: z.string().max(2000).nullable().optional(),
  valueNumber: z.coerce.number().nullable().optional(),
  valueBoolean: z.boolean().nullable().optional(),
  optionId: z.int().positive().nullable().optional(),
});
export type ProductAttributeValueInput = z.infer<typeof productAttributeValueInputSchema>;

export const createProductSchema = registry.register(
  "CreateProductInput",
  z.object({
    categoryId: z.int().positive(),
    productBrandId: z.int().positive().nullable().optional(),
    name: localizedStringSchema,
    slug: slugField,
    metaTitle: z.string().max(70).nullable().optional(),
    metaDescription: z.string().max(200).nullable().optional(),
    descriptionKa: optionalDescription,
    descriptionEn: optionalDescription,
    descriptionRu: optionalDescription,
    attributeValues: z.array(productAttributeValueInputSchema).optional(),
  }),
);
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = registry.register(
  "UpdateProductInput",
  createProductSchema.partial(),
);
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const attributeFilterSchema = z.object({
  // Pre-grouped by attribute on the client (one filter block per attribute):
  // each entry ANDs against the others, while the optionIds within one
  // entry OR together (pick any of these values for THIS attribute).
  selectFilters: z
    .array(z.object({ attributeId: z.int().positive(), optionIds: z.array(z.int().positive()).min(1) }))
    .optional(),
  booleanAttributeIds: z.array(z.int().positive()).optional(),
  numberRanges: z
    .array(
      z.object({
        attributeId: z.int().positive(),
        min: z.number().optional(),
        max: z.number().optional(),
      }),
    )
    .optional(),
});
export type AttributeFilterInput = z.infer<typeof attributeFilterSchema>;

// ?brandIds=1&brandIds=2 parses to a string[] via qs, but a single
// ?brandIds=1 parses to a bare string — normalize both into an array before
// coercing each entry to a number.
const brandIdsQuerySchema = z
  .preprocess(
    (value) => (value == null ? undefined : Array.isArray(value) ? value : [value]),
    z.array(z.coerce.number().int().positive()),
  )
  .optional();

export const productListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  // "My vehicle" filter (shop-facing MY_VEHICLE category filter, and the
  // garage's cross-category "compatible products" page) — narrows to
  // products with a ProductFitment row for this catalog entry.
  vehicleCatalogId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(200).optional(),
  brandIds: brandIdsQuerySchema,
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().nonnegative().optional(),
  // "Sale" page (homepage CTA slide + /sale) — narrows to products with at
  // least one variant currently on an active discount, across every category.
  onSale: z.coerce.boolean().optional(),
  // Homepage sliders (see homepage-sections module) cap how many products
  // they pull — optional everywhere else.
  limit: z.coerce.number().int().positive().max(50).optional(),
  // URL-encoded JSON rather than ad-hoc flat query keys — keeps the shape
  // extensible and lets it be validated as one nested object.
  attributeFilters: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "attributeFilters არასწორი JSON-ია" });
        return z.NEVER;
      }
      const result = attributeFilterSchema.safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: "custom", message: "attributeFilters არასწორი ფორმატია" });
        return z.NEVER;
      }
      return result.data;
    })
    // Trailing .optional() (in addition to the one before .transform()):
    // without it, zod infers this key as required-but-possibly-undefined
    // instead of an optional key, which breaks Express's route handler
    // overload resolution against the default ParsedQs query type.
    .optional(),
  // Admin-only "filter everything" panel — separate from the shop-facing
  // params above, additive, never required. See
  // filters/product/product-admin-filter-registry.ts.
  adminFilters: adminFiltersQuerySchema,
  // Admin-list server-side pagination (only meaningful alongside
  // adminFilters — the storefront path uses `limit` above instead). Both
  // optional, no `.default()` — an output key zod infers as
  // required-but-defaulted breaks Express's route handler overload
  // resolution against the default ParsedQs query type (see
  // attributeFilters' comment above for the same reasoning).
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productSlugParamSchema = z.object({
  slug: z.string().min(1),
});
export type ProductSlugParam = z.infer<typeof productSlugParamSchema>;

// Optional — when the shopper has a vehicle selected (shop's "my vehicle"
// filter), the detail response's buyTogether companions are narrowed to
// ones compatible with it instead of always showing every configured one.
export const productDetailQuerySchema = z.object({
  vehicleCatalogId: z.coerce.number().int().positive().optional(),
});
export type ProductDetailQuery = z.infer<typeof productDetailQuerySchema>;

// Homepage "popular products" slider — ranked by total sold quantity
// (Order/OrderItem), see products.service.ts's listPopularProducts.
export const popularProductsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});
export type PopularProductsQuery = z.infer<typeof popularProductsQuerySchema>;

// Checkout's "check compatibility" widget — a known set of cart product ids
// against one vehicle, reusing buildVehicleCompatibilityWhere the same way
// getProductDetail already does for buyTogether companions (see
// products.service.ts's checkProductsCompatibility).
export const checkCompatibilitySchema = registry.register(
  "CheckCompatibilityInput",
  z.object({
    productIds: z.array(z.int().positive()).min(1).max(100),
    vehicleCatalogId: z.int().positive(),
  }),
);
export type CheckCompatibilityInput = z.infer<typeof checkCompatibilitySchema>;

export const checkCompatibilityResponseSchema = registry.register(
  "CheckCompatibilityResponse",
  z.object({
    compatibleProductIds: z.array(z.int()),
  }),
);

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });
const brandModelRefSchema = z.object({ id: z.int(), name: z.string(), slug: z.string() });

const unitRefSchema = z.object({
  id: z.int(),
  name: localizedStringSchema,
  abbreviation: localizedStringSchema,
});

const productAttributeValueResponseSchema = z.object({
  attributeId: z.int(),
  attributeName: localizedStringSchema,
  valueType: attributeValueTypeSchema,
  unit: unitRefSchema.nullable(),
  valueText: z.string().nullable(),
  valueNumber: z.number().nullable(),
  valueBoolean: z.boolean().nullable(),
  option: z.object({ id: z.int(), key: z.string(), label: localizedStringSchema }).nullable(),
});

const productCardDiscountSchema = z.object({
  price: z.number().openapi({ example: 199.99 }),
  discountPrice: z.number().openapi({ example: 159.99 }),
});

export const productResponseSchema = registry.register(
  "Product",
  z.object({
    id: z.int().openapi({ example: 1 }),
    category: namedRefSchema,
    productBrand: brandModelRefSchema.nullable(),
    name: localizedStringSchema,
    slug: z.string(),
    metaTitle: z.string().nullable(),
    metaDescription: z.string().nullable(),
    descriptionKa: z.string().nullable(),
    descriptionEn: z.string().nullable(),
    descriptionRu: z.string().nullable(),
    imageUrl: z.string().nullable(),
    attributeValues: z.array(productAttributeValueResponseSchema),
    variantCount: z.int().openapi({ example: 2 }),
    minPrice: z.number().nullable().openapi({ example: 199.99 }),
    totalStock: z.int().openapi({ example: 5 }),
    // "Only N left" storefront urgency badge — null when the category has
    // it disabled, the product is out of stock, or stock is above the
    // low-stock threshold. See lib/low-stock.ts.
    lowStockQuantity: z.int().nullable().openapi({ example: null }),
    // The regular/discount price pair of whichever variant currently has the
    // lowest active discount — null if no variant is on discount right now.
    activeDiscount: productCardDiscountSchema.nullable(),
    // Detail-page view counter (see products.service.ts's getProductDetail)
    // — an admin-facing interest signal, separate from the Order-based
    // "most sold" ranking used by the popular-products slider.
    viewCount: z.int().openapi({ example: 0 }),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

const productVariantDetailResponseSchema = z.object({
  id: z.int().openapi({ example: 1 }),
  sku: z.string().nullable(),
  price: z.number().openapi({ example: 199.99 }),
  stockQuantity: z.int(),
  lowStockQuantity: z.int().nullable().openapi({ example: null }),
  isActive: z.boolean(),
  size: lookupItemResponseSchema.nullable(),
  color: lookupItemResponseSchema.nullable(),
  condition: lookupItemResponseSchema.nullable(),
  status: lookupItemResponseSchema.nullable(),
  images: z.array(productVariantImageResponseSchema),
  discounts: z.array(productVariantDiscountResponseSchema),
  // Narrower than a full ProductVariantDiscount row on purpose — this may
  // be derived from a ProductDiscountRule (no real DB row/id/dates of its
  // own), and no consumer reads anything but discountPrice here (the
  // crossed-out original price is always the variant's own `price` field).
  activeDiscount: z.object({ discountPrice: z.number().openapi({ example: 159.99 }) }).nullable(),
});

const compatibleVehicleSchema = z.object({
  id: z.int(),
  brand: brandModelRefSchema,
  model: brandModelRefSchema,
});

const vehicleSpecFieldSchema = z.enum([
  "FUEL_TYPE",
  "TRANSMISSION_TYPE",
  "COOLING_TYPE",
  "FINAL_DRIVE_TYPE",
  "DRIVE_TYPE",
  "START_TYPE",
  "POWERTRAIN_TYPE",
]);

// Summarized, not enumerated — an "all vehicles" rule would otherwise mean
// listing hundreds of catalog rows on the product page. See
// products.service.ts's toFitmentRuleResponse.
const fitmentRuleSchema = z.object({
  id: z.int(),
  type: z.enum(["CATEGORY", "SPEC", "ALL"]),
  category: namedRefSchema.nullable(),
  specField: vehicleSpecFieldSchema.nullable(),
  specFieldLabel: localizedStringSchema.nullable(),
  specValue: lookupItemResponseSchema.nullable(),
});

export const productDetailResponseSchema = registry.register(
  "ProductDetail",
  productResponseSchema.extend({
    variants: z.array(productVariantDetailResponseSchema),
    fitments: z.array(compatibleVehicleSchema),
    fitmentRules: z.array(fitmentRuleSchema),
    buyTogether: z.array(productResponseSchema),
  }),
);

const productSaleOrderSchema = z.object({
  orderId: z.int(),
  orderCode: z.string(),
  createdAt: z.iso.datetime(),
  buyerName: z.string(),
  buyerEmail: z.string(),
  quantity: z.int(),
  lineTotal: z.number(),
  status: z.string(),
});

const productSalesSummarySchema = z.object({
  totalQuantitySold: z.int(),
  totalRevenue: z.number(),
  orderCount: z.int(),
  recentOrders: z.array(productSaleOrderSchema),
});

// Admin-only counterpart to productDetailResponseSchema — adds sales
// history, which the public by-slug endpoint has no reason to expose.
export const productDetailAdminResponseSchema = registry.register(
  "ProductDetailAdmin",
  productDetailResponseSchema.extend({
    sales: productSalesSummarySchema,
  }),
);

import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { adminFiltersQuerySchema } from "../filters/filter-request.schema.js";

const slugField = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი")
  .openapi({ example: "helmets" });

const localizedNameField = localizedStringSchema.openapi({
  example: { ka: "ჩაფხუტები", en: "Helmets", ru: "Шлемы" },
});

export const createCategorySchema = registry.register(
  "CreateCategoryInput",
  z.object({
    name: localizedNameField,
    slug: slugField,
    parentId: z.int().positive().nullable().optional().openapi({ example: null }),
    sortOrder: z.int().optional().openapi({ example: 0 }),
    // Storefront "only N left" badge on this category's products — see
    // Category.lowStockBadgeEnabled. Optional/undefined leaves the DB
    // default (true) on create, or the existing value on update.
    lowStockBadgeEnabled: z.boolean().optional().openapi({ example: true }),
    // Can this category's items be bought on the site (cart/checkout)? Off
    // = storefront shows "visit the showroom" instead; applies to every
    // subcategory too. See Category.onlinePurchaseEnabled.
    onlinePurchaseEnabled: z.boolean().optional().openapi({ example: true }),
    // Do this category's products depend on the vehicle (fitment)? Off =
    // vehicle-independent (e.g. helmets); applies to every subcategory too.
    // See Category.vehicleFitmentEnabled.
    vehicleFitmentEnabled: z.boolean().optional().openapi({ example: true }),
    // Does this category inherit its parents' attributes? Off = only
    // attributes defined on it or below apply. See Category.inheritsAttributes.
    inheritsAttributes: z.boolean().optional().openapi({ example: true }),
    // Size scale of its products' variants (null = inherit from parent).
    // See Category.sizeScaleId.
    sizeScaleId: z.int().positive().nullable().optional(),
  }),
);
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = registry.register(
  "UpdateCategoryInput",
  createCategorySchema.partial(),
);
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryAttributeImpactSchema = registry.register(
  "CategoryAttributeImpactInput",
  z.object({
    parentId: z.int().positive().nullable().optional(),
    inheritsAttributes: z.boolean().optional(),
  }),
);
export type CategoryAttributeImpactInput = z.infer<typeof categoryAttributeImpactSchema>;

export const categoryAttributeImpactResponseSchema = registry.register(
  "CategoryAttributeImpact",
  z.object({
    removedValueCount: z.int(),
    affectedProductCount: z.int(),
    removedAttributes: z.array(z.object({ id: z.int(), name: z.string() })),
    newlyRequired: z.array(z.object({ id: z.int(), name: z.string(), missingProductCount: z.int() })),
    // Parent changes only: inherited size scale changes, and products whose
    // brand would no longer belong to their category.
    sizeScaleChanges: z.array(
      z.object({
        from: z.string().nullable(),
        to: z.string().nullable(),
        categoryCount: z.int(),
        variantsOutsideScale: z.int(),
      }),
    ),
    brandMismatch: z.object({
      productCount: z.int(),
      brands: z.array(z.object({ id: z.int(), name: z.string() })),
    }),
  }),
);

export const categoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;

export const categoryListQuerySchema = z.object({
  adminFilters: adminFiltersQuerySchema,
});
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;

export const categoryItemCountsResponseSchema = registry.register(
  "CategoryItemCounts",
  z.object({
    items: z.array(
      z.object({
        categoryId: z.int(),
        // Storefront-visible products (or vehicle listings for transport
        // categories) in the category and all its subcategories.
        count: z.int(),
      }),
    ),
  }),
);

export const categoryResponseSchema = registry.register(
  "Category",
  z.object({
    id: z.int().openapi({ example: 1 }),
    name: localizedNameField,
    slug: z.string().openapi({ example: "helmets" }),
    imageUrl: z.string().nullable().openapi({ example: "/uploads/categories/123.jpg" }),
    bannerImageUrl: z.string().nullable().openapi({ example: "/uploads/categories-banner/123.jpg" }),
    menuImageUrl: z.string().nullable().openapi({ example: "/uploads/categories-menu/123.jpg" }),
    sortOrder: z.int().openapi({ example: 0 }),
    lowStockBadgeEnabled: z.boolean().openapi({ example: true }),
    onlinePurchaseEnabled: z.boolean().openapi({ example: true }),
    vehicleFitmentEnabled: z.boolean().openapi({ example: true }),
    inheritsAttributes: z.boolean().openapi({ example: true }),
    sizeScaleId: z.int().nullable(),
    parentId: z.int().nullable(),
    parent: z
      .object({ id: z.int(), name: localizedStringSchema })
      .nullable()
      .optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { adminFiltersQuerySchema } from "../filters/filter-request.schema.js";

const slugField = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი")
  .openapi({ example: "agv" });

const nameField = z.string().min(1).max(120).openapi({ example: "AGV" });

export const createProductBrandSchema = registry.register(
  "CreateProductBrandInput",
  z.object({
    // A brand can sell into several unrelated category branches at once
    // (e.g. Alpinestars: gloves, jackets, helmets) — see
    // prisma/models/product-brand.prisma.
    categoryIds: z.array(z.int().positive()).min(1),
    name: nameField,
    slug: slugField,
  }),
);
export type CreateProductBrandInput = z.infer<typeof createProductBrandSchema>;

export const updateProductBrandSchema = registry.register(
  "UpdateProductBrandInput",
  createProductBrandSchema.partial(),
);
export type UpdateProductBrandInput = z.infer<typeof updateProductBrandSchema>;

export const productBrandIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// `categoryId` is the long-standing ad hoc single-category scope (ancestor-
// inclusive — see listProductBrands), used by ProductForm/PromoCodeFormModal
// to narrow "which brands apply here". `adminFilters`/`page`/`pageSize` are
// additive, for the admin product-brands list screen; sending page/pageSize
// is what triggers real pagination.
export const productBrandListQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  // With categoryId: also brands linked only to the category's
  // descendants — a promo code scoped to a parent category ("ეკიპირება")
  // can target a brand that's linked just to its leaves (Alpinestars →
  // gloves, jackets, ...). A product picks from its own category upward,
  // so ProductForm doesn't send it.
  includeDescendants: z.enum(["true", "false"]).optional(),
  adminFilters: adminFiltersQuerySchema,
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type ProductBrandListQuery = z.infer<typeof productBrandListQuerySchema>;

const categoryRefSchema = z.object({
  id: z.int(),
  name: localizedStringSchema,
  slug: z.string(),
});

export const productBrandResponseSchema = registry.register(
  "ProductBrand",
  z.object({
    id: z.int().openapi({ example: 1 }),
    categories: z.array(categoryRefSchema),
    name: nameField,
    slug: z.string().openapi({ example: "agv" }),
    logoUrl: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

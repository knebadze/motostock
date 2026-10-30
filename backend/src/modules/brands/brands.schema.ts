import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { adminFiltersQuerySchema } from "../filters/filter-request.schema.js";

const slugField = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "მხოლოდ პატარა ლათინური ასოები, ციფრები და დეფისი")
  .openapi({ example: "honda" });

const nameField = z.string().min(1).max(120).openapi({ example: "Honda" });

export const createBrandSchema = registry.register(
  "CreateBrandInput",
  z.object({
    name: nameField,
    slug: slugField,
  }),
);
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = registry.register(
  "UpdateBrandInput",
  createBrandSchema.partial(),
);
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

export const brandIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
export type BrandIdParam = z.infer<typeof brandIdParamSchema>;

// page/pageSize are both optional and only trigger true server-side
// pagination when at least one is present (see brandsService.listBrands) —
// every other caller (brand/model pickers across the admin panel) keeps
// reading the full, unbounded list under the old `{ brands: [...] }` shape.
export const brandListQuerySchema = z.object({
  adminFilters: adminFiltersQuerySchema,
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type BrandListQuery = z.infer<typeof brandListQuerySchema>;

export const brandResponseSchema = registry.register(
  "Brand",
  z.object({
    id: z.int().openapi({ example: 1 }),
    name: nameField,
    slug: z.string().openapi({ example: "honda" }),
    logoUrl: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

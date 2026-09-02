import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { localizedStringSchema } from "../../lib/localized.js";
import { productResponseSchema } from "../products/products.schema.js";

export const productBuyTogetherProductIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export const productBuyTogetherIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});

export const createProductBuyTogetherSchema = registry.register(
  "CreateProductBuyTogetherInput",
  z.object({
    relatedProductId: z.int().positive(),
  }),
);
export type CreateProductBuyTogetherInput = z.infer<typeof createProductBuyTogetherSchema>;

export const productBuyTogetherResponseSchema = registry.register(
  "ProductBuyTogether",
  z.object({
    id: z.int().openapi({ example: 1 }),
    productId: z.int(),
    relatedProduct: productResponseSchema,
    createdAt: z.iso.datetime(),
  }),
);

// Admin-only unified overview (see /admin/buy-together) — lighter than the
// full Product shape above, only what the cross-product table needs.
// page/pageSize are real server-side pagination (skip/take), not the
// client-side slicing most other admin lists use — this table spans every
// product pair project-wide and has no natural cap. Both optional
// (defaults applied in the controller, not via zod's `.default()`) — an
// output key zod infers as required-but-defaulted breaks Express's route
// handler overload resolution against the default ParsedQs query type
// (same reasoning as error-logs.schema.ts).
export const listProductBuyTogetherAdminQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type ListProductBuyTogetherAdminQuery = z.infer<typeof listProductBuyTogetherAdminQuerySchema>;

const namedRefSchema = z.object({ id: z.int(), name: localizedStringSchema, slug: z.string() });
const productRefSchema = namedRefSchema.extend({ category: namedRefSchema });

export const adminProductBuyTogetherResponseSchema = registry.register(
  "AdminProductBuyTogether",
  z.object({
    id: z.int().openapi({ example: 1 }),
    product: productRefSchema,
    relatedProduct: productRefSchema,
    createdAt: z.iso.datetime(),
  }),
);

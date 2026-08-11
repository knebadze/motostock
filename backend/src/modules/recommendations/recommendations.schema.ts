import { z } from "zod";
import { registry } from "../../docs/registry.js";
import { productResponseSchema } from "../products/products.schema.js";

export const recommendationsProductIdParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});
export type RecommendationsProductIdParam = z.infer<typeof recommendationsProductIdParamSchema>;

// Shared by the two product-scoped endpoints (similar / frequently bought
// together) — vehicleCatalogId narrows results to ones compatible with the
// shopper's selected vehicle, same optional param getProductDetail already
// accepts for buyTogether.
export const productRecommendationsQuerySchema = z.object({
  vehicleCatalogId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});
export type ProductRecommendationsQuery = z.infer<typeof productRecommendationsQuerySchema>;

export const popularForVehicleQuerySchema = z.object({
  vehicleCatalogId: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});
export type PopularForVehicleQuery = z.infer<typeof popularForVehicleQuerySchema>;

export const recommendedForMeQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});
export type RecommendedForMeQuery = z.infer<typeof recommendedForMeQuerySchema>;

export const recommendationsListResponseSchema = registry.register(
  "RecommendationsList",
  z.object({ items: z.array(productResponseSchema) }),
);

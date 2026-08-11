import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as recommendationsController from "./recommendations.controller.js";
import {
  popularForVehicleQuerySchema,
  productRecommendationsQuerySchema,
  recommendationsListResponseSchema,
  recommendationsProductIdParamSchema,
  recommendedForMeQuerySchema,
} from "./recommendations.schema.js";

// Product-scoped, mounted at /api/products/:productId/recommendations —
// public (the product detail page is a guest-facing page), mirrors
// product-buy-together.routes.ts's nested router shape minus the auth gate.
export const productRecommendationsRouter = Router({ mergeParams: true });

productRecommendationsRouter.get(
  "/similar",
  validate(recommendationsProductIdParamSchema, "params"),
  validate(productRecommendationsQuerySchema, "query"),
  recommendationsController.getSimilar,
);
productRecommendationsRouter.get(
  "/frequently-bought-together",
  validate(recommendationsProductIdParamSchema, "params"),
  validate(productRecommendationsQuerySchema, "query"),
  recommendationsController.getFrequentlyBoughtTogether,
);
productRecommendationsRouter.get(
  "/viewed-together",
  validate(recommendationsProductIdParamSchema, "params"),
  validate(productRecommendationsQuerySchema, "query"),
  recommendationsController.getViewedTogether,
);

// Top-level, mounted at /api/recommendations. /popular-for-vehicle is
// public; /for-me is path-scoped to requireAuth only (same pattern
// garage.routes.ts uses) since it's the one genuinely user-specific route
// in this router.
export const recommendationsRouter = Router();

recommendationsRouter.get(
  "/popular-for-vehicle",
  validate(popularForVehicleQuerySchema, "query"),
  recommendationsController.getPopularForVehicle,
);

recommendationsRouter.use("/for-me", requireAuth);
recommendationsRouter.get(
  "/for-me",
  validate(recommendedForMeQuerySchema, "query"),
  recommendationsController.getForMe,
);

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: "get",
  path: "/products/{productId}/recommendations/similar",
  tags: ["Recommendations"],
  summary: "Algorithmic 'similar products' — same category, ranked by shared fitment overlap (public)",
  request: { params: recommendationsProductIdParamSchema, query: productRecommendationsQuerySchema },
  responses: {
    200: { description: "Similar products", content: { "application/json": { schema: recommendationsListResponseSchema } } },
    404: { description: "Product not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/{productId}/recommendations/frequently-bought-together",
  tags: ["Recommendations"],
  summary: "Algorithmic 'frequently bought together' — co-purchase counts from order history (public)",
  request: { params: recommendationsProductIdParamSchema, query: productRecommendationsQuerySchema },
  responses: {
    200: { description: "Frequently bought together", content: { "application/json": { schema: recommendationsListResponseSchema } } },
    404: { description: "Product not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/{productId}/recommendations/viewed-together",
  tags: ["Recommendations"],
  summary: "'Customers who viewed this also viewed' — view-based co-occurrence (public)",
  request: { params: recommendationsProductIdParamSchema, query: productRecommendationsQuerySchema },
  responses: {
    200: { description: "Viewed together", content: { "application/json": { schema: recommendationsListResponseSchema } } },
    404: { description: "Product not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/recommendations/popular-for-vehicle",
  tags: ["Recommendations"],
  summary: "Bestsellers restricted to one vehicle's compatible products (public — homepage POPULAR_FOR_VEHICLE section)",
  request: { query: popularForVehicleQuerySchema },
  responses: {
    200: { description: "Popular for vehicle", content: { "application/json": { schema: recommendationsListResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/recommendations/for-me",
  tags: ["Recommendations"],
  summary: "Personalized recommendations from the caller's order/wishlist affinity and garage vehicles",
  security,
  request: { query: recommendedForMeQuerySchema },
  responses: {
    200: { description: "Recommended for you", content: { "application/json": { schema: recommendationsListResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

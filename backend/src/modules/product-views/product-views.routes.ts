import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import * as productViewsController from "./product-views.controller.js";
import { recentlyViewedQuerySchema, recentlyViewedResponseSchema } from "./product-views.schema.js";

// Mounted at /api/users/me/recently-viewed (see app.ts) — public, no
// requireAuth: works for both logged-in users and guests via
// resolveProductViewOwner, same reasoning as the passive view-tracking
// write path itself.
export const productViewsRouter = Router();

productViewsRouter.get(
  "/me/recently-viewed",
  validate(recentlyViewedQuerySchema, "query"),
  productViewsController.getRecentlyViewed,
);

registry.registerPath({
  method: "get",
  path: "/users/me/recently-viewed",
  tags: ["Recommendations"],
  summary: "The caller's own recently viewed products (works for guests via the shared guest-id cookie)",
  request: { query: recentlyViewedQuerySchema },
  responses: {
    200: {
      description: "Recently viewed products",
      content: { "application/json": { schema: recentlyViewedResponseSchema } },
    },
  },
});

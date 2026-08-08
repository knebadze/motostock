import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as productBuyTogetherController from "./product-buy-together.controller.js";
import {
  adminProductBuyTogetherResponseSchema,
  createProductBuyTogetherSchema,
  listProductBuyTogetherAdminQuerySchema,
  productBuyTogetherIdParamSchema,
  productBuyTogetherProductIdParamSchema,
  productBuyTogetherResponseSchema,
} from "./product-buy-together.schema.js";

export const productBuyTogetherRouter = Router({ mergeParams: true });

productBuyTogetherRouter.use(requireAuth, requireRole(ROLES.ADMIN));

productBuyTogetherRouter.get(
  "/",
  validate(productBuyTogetherProductIdParamSchema, "params"),
  productBuyTogetherController.list,
);
productBuyTogetherRouter.post(
  "/",
  validate(productBuyTogetherProductIdParamSchema, "params"),
  validate(createProductBuyTogetherSchema),
  productBuyTogetherController.create,
);
productBuyTogetherRouter.delete(
  "/:id",
  validate(productBuyTogetherIdParamSchema, "params"),
  productBuyTogetherController.remove,
);

// Separate top-level router (not nested under :productId) — the router
// above is always mounted at /api/products/:productId/buy-together in
// app.ts, so every route inside it automatically inherits that prefix and
// can't expose a cross-product "list everything" endpoint. Mirrors
// compatibility.routes.ts's reasoning exactly.
export const productBuyTogetherAdminRouter = Router();
productBuyTogetherAdminRouter.use(requireAuth, requireRole(ROLES.ADMIN));
productBuyTogetherAdminRouter.get(
  "/",
  validate(listProductBuyTogetherAdminQuerySchema, "query"),
  productBuyTogetherController.listAll,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(productBuyTogetherResponseSchema) });
const itemResponse = z.object({ item: productBuyTogetherResponseSchema });
const adminListResponse = z.object({ items: z.array(adminProductBuyTogetherResponseSchema) });

registry.registerPath({
  method: "get",
  path: "/products/{productId}/buy-together",
  tags: ["ProductBuyTogether"],
  summary: "List the 'frequently bought together' companion products configured for a product",
  security,
  request: { params: productBuyTogetherProductIdParamSchema },
  responses: {
    200: { description: "Companion products", content: { "application/json": { schema: listResponse } } },
    404: { description: "Product not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/products/{productId}/buy-together",
  tags: ["ProductBuyTogether"],
  summary: "Attach a companion product to a product's 'buy together' section",
  security,
  request: {
    params: productBuyTogetherProductIdParamSchema,
    body: { content: { "application/json": { schema: createProductBuyTogetherSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid related product", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Product not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Already attached", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/products/{productId}/buy-together/{id}",
  tags: ["ProductBuyTogether"],
  summary: "Remove a companion product",
  security,
  request: { params: productBuyTogetherIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/product-buy-together",
  tags: ["ProductBuyTogether"],
  summary: "List every 'buy together' pair across every product, with search/category filters (admin only)",
  security,
  request: { query: listProductBuyTogetherAdminQuerySchema },
  responses: {
    200: { description: "Pairs", content: { "application/json": { schema: adminListResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

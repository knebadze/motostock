import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as productsController from "./products.controller.js";
import {
  checkCompatibilitySchema,
  checkCompatibilityResponseSchema,
  createProductSchema,
  popularProductsQuerySchema,
  productDetailAdminResponseSchema,
  productDetailQuerySchema,
  productDetailResponseSchema,
  productIdParamSchema,
  productListQuerySchema,
  productResponseSchema,
  productSlugParamSchema,
  updateProductSchema,
} from "./products.schema.js";

export const productsRouter = Router();

// Public: the guest shop page + product detail page read these. Everything
// else stays admin-only. /popular is registered before /:id so the literal
// "popular" segment isn't swallowed by the :id param route.
productsRouter.get("/", validate(productListQuerySchema, "query"), productsController.list);
productsRouter.get(
  "/popular",
  validate(popularProductsQuerySchema, "query"),
  productsController.getPopular,
);
productsRouter.get(
  "/by-slug/:slug",
  validate(productSlugParamSchema, "params"),
  validate(productDetailQuerySchema, "query"),
  productsController.getBySlug,
);
// Checkout's "check compatibility" widget — POST (not GET) since the cart's
// product id list can be arbitrarily long; no collision risk with /:id
// regardless of declaration order (different HTTP method).
productsRouter.post(
  "/check-compatibility",
  validate(checkCompatibilitySchema),
  productsController.checkCompatibility,
);
productsRouter.get("/:id", validate(productIdParamSchema, "params"), productsController.getOne);

// requireAuth/requireRole are applied per-route below (not as a blanket
// `productsRouter.use(...)`) — a path-less `.use()` intercepts every request
// that reaches this router, including ones that don't match any route
// declared here (e.g. `/api/products/:productId/recommendations/*`, served
// by the separate, deliberately-public productRecommendationsRouter mounted
// after this one in app.ts). That blanket form previously 401/403'd every
// guest/non-admin recommendation request before it could ever reach the
// right router — same bug class already fixed once for /api/users (see that
// module's identical per-route pattern).
productsRouter.get(
  "/:id/detail",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(productIdParamSchema, "params"),
  productsController.getDetailAdmin,
);
productsRouter.post(
  "/",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(createProductSchema),
  productsController.create,
);
productsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  productsController.update,
);
productsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(productIdParamSchema, "params"),
  productsController.remove,
);
productsRouter.post(
  "/:id/image",
  requireAuth,
  requireRole(ROLES.ADMIN),
  validate(productIdParamSchema, "params"),
  imageUpload().single("image"),
  productsController.uploadImage,
);

const security = [{ cookieAuth: [] }];
// total/page/pageSize are only populated for the admin-list path (adminFilters
// present) — the storefront/popular paths never send page/pageSize and their
// responses omit these three fields, so they stay optional here.
const listResponse = z.object({
  items: z.array(productResponseSchema),
  total: z.number().int().nonnegative().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});
const itemResponse = z.object({ item: productResponseSchema });

registry.registerPath({
  method: "get",
  path: "/products",
  tags: ["Products"],
  summary: "List products, optionally scoped to a category (public — guest shop page)",
  request: { query: productListQuerySchema },
  responses: {
    200: { description: "Products list", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/popular",
  tags: ["Products"],
  summary: "List products ranked by total sold quantity (public — homepage popular-products slider)",
  request: { query: popularProductsQuerySchema },
  responses: {
    200: { description: "Popular products", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/{id}",
  tags: ["Products"],
  summary: "Get a product by id (public)",
  request: { params: productIdParamSchema },
  responses: {
    200: { description: "Product", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/by-slug/{slug}",
  tags: ["Products"],
  summary: "Get a product's full detail (variants, images, discounts, fitments) by slug (public — product view page)",
  request: { params: productSlugParamSchema },
  responses: {
    200: {
      description: "Product detail",
      content: { "application/json": { schema: z.object({ item: productDetailResponseSchema }) } },
    },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/products/check-compatibility",
  tags: ["Products"],
  summary: "Check a set of product ids against one vehicle for fitment compatibility (public — checkout compatibility widget)",
  request: { body: { content: { "application/json": { schema: checkCompatibilitySchema } } } },
  responses: {
    200: {
      description: "Compatible product ids",
      content: { "application/json": { schema: checkCompatibilityResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/{id}/detail",
  tags: ["Products"],
  summary: "Get a product's full detail (variants, images, discounts, fitments, buyTogether, sales history) by id — admin full-view, doesn't count as a customer view",
  security,
  request: { params: productIdParamSchema },
  responses: {
    200: {
      description: "Product detail",
      content: { "application/json": { schema: z.object({ item: productDetailAdminResponseSchema }) } },
    },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/products",
  tags: ["Products"],
  summary: "Create a product",
  security,
  request: { body: { content: { "application/json": { schema: createProductSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid category/brand/attribute values", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/products/{id}",
  tags: ["Products"],
  summary: "Update a product",
  security,
  request: {
    params: productIdParamSchema,
    body: { content: { "application/json": { schema: updateProductSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    400: {
      description: "categoryId doesn't match the product's current category — category can't be changed after creation",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/products/{id}",
  tags: ["Products"],
  summary: "Delete a product",
  security,
  request: { params: productIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "Product in use", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/products/{id}/image",
  tags: ["Products"],
  summary: "Upload a product image",
  security,
  request: {
    params: productIdParamSchema,
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ image: z.string().openapi({ format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    200: { description: "Uploaded", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

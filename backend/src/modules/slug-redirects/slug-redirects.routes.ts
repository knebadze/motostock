import { Router } from "express";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import {
  categorySlugRedirectResponseSchema,
  productSlugRedirectResponseSchema,
  slugRedirectParamSchema,
} from "./slug-redirects.schema.js";
import * as slugRedirectsController from "./slug-redirects.controller.js";

// Public — the storefront's product/category routes ask this after a slug
// lookup misses, to 301 an old (renamed) URL instead of a 404.
export const slugRedirectsRouter = Router();

slugRedirectsRouter.get(
  "/products/:slug",
  validate(slugRedirectParamSchema, "params"),
  slugRedirectsController.resolveProduct,
);

slugRedirectsRouter.get(
  "/categories/:slug",
  validate(slugRedirectParamSchema, "params"),
  slugRedirectsController.resolveCategory,
);

registry.registerPath({
  method: "get",
  path: "/slug-redirects/products/{slug}",
  tags: ["Products"],
  summary: "Current URL parts of a product that used to have this slug (renamed) — public",
  request: { params: slugRedirectParamSchema },
  responses: {
    200: { description: "Current slug", content: { "application/json": { schema: productSlugRedirectResponseSchema } } },
    404: { description: "Not a known old slug", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/slug-redirects/categories/{slug}",
  tags: ["Categories"],
  summary: "Current slug of a category that used to have this slug (renamed) — public",
  request: { params: slugRedirectParamSchema },
  responses: {
    200: { description: "Current slug", content: { "application/json": { schema: categorySlugRedirectResponseSchema } } },
    404: { description: "Not a known old slug", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

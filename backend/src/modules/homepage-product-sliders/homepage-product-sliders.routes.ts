import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as homepageProductSlidersController from "./homepage-product-sliders.controller.js";
import {
  homepageProductSliderIdParamSchema,
  homepageProductSliderResponseSchema,
  updateHomepageProductSliderSchema,
} from "./homepage-product-sliders.schema.js";

export const homepageProductSlidersRouter = Router();

// Public — only active sliders, for the homepage. Registered before the
// admin gate below, same narrow-public-endpoint pattern as
// /hero-slides/public: the full admin resource (including inactive rows)
// stays admin-only.
homepageProductSlidersRouter.get("/public", homepageProductSlidersController.listPublic);

homepageProductSlidersRouter.use(requireAuth, requireRole(ROLES.ADMIN));

homepageProductSlidersRouter.get("/", homepageProductSlidersController.list);
homepageProductSlidersRouter.patch(
  "/:id",
  validate(homepageProductSliderIdParamSchema, "params"),
  validate(updateHomepageProductSliderSchema),
  homepageProductSlidersController.update,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(homepageProductSliderResponseSchema) });
const itemResponse = z.object({ item: homepageProductSliderResponseSchema });

registry.registerPath({
  method: "get",
  path: "/homepage-product-sliders/public",
  tags: ["HomepageProductSliders"],
  summary: "List active homepage product sliders (public)",
  responses: {
    200: { description: "Active sliders", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/homepage-product-sliders",
  tags: ["HomepageProductSliders"],
  summary: "List all homepage product sliders, including inactive ones (admin)",
  security,
  responses: {
    200: { description: "Sliders", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/homepage-product-sliders/{id}",
  tags: ["HomepageProductSliders"],
  summary: "Update a homepage product slider's title/active/order/item count",
  security,
  request: {
    params: homepageProductSliderIdParamSchema,
    body: { content: { "application/json": { schema: updateHomepageProductSliderSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

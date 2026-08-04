import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as productBuyTogetherController from "./product-buy-together.controller.js";
import {
  createProductBuyTogetherSchema,
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

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(productBuyTogetherResponseSchema) });
const itemResponse = z.object({ item: productBuyTogetherResponseSchema });

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

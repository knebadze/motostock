import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as productFitmentController from "./product-fitment.controller.js";
import {
  createProductFitmentSchema,
  productFitmentIdParamSchema,
  productFitmentProductIdParamSchema,
  productFitmentResponseSchema,
} from "./product-fitment.schema.js";

export const productFitmentRouter = Router({ mergeParams: true });

productFitmentRouter.use(requireAuth, requireRole(ROLES.ADMIN));

productFitmentRouter.get(
  "/",
  validate(productFitmentProductIdParamSchema, "params"),
  productFitmentController.list,
);
productFitmentRouter.post(
  "/",
  validate(productFitmentProductIdParamSchema, "params"),
  validate(createProductFitmentSchema),
  productFitmentController.create,
);
productFitmentRouter.delete(
  "/:id",
  validate(productFitmentIdParamSchema, "params"),
  productFitmentController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(productFitmentResponseSchema) });
const itemResponse = z.object({ item: productFitmentResponseSchema });

registry.registerPath({
  method: "get",
  path: "/products/{productId}/fitments",
  tags: ["ProductFitment"],
  summary: "List vehicle-catalog compatibility entries for a product",
  security,
  request: { params: productFitmentProductIdParamSchema },
  responses: {
    200: { description: "Fitments", content: { "application/json": { schema: listResponse } } },
    404: { description: "Product not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/products/{productId}/fitments",
  tags: ["ProductFitment"],
  summary: "Attach a vehicle-catalog entry as compatible with a product",
  security,
  request: {
    params: productFitmentProductIdParamSchema,
    body: { content: { "application/json": { schema: createProductFitmentSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid vehicle catalog entry", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Product not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Already attached", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/products/{productId}/fitments/{id}",
  tags: ["ProductFitment"],
  summary: "Remove a compatibility entry",
  security,
  request: { params: productFitmentIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

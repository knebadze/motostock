import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as productFitmentRulesController from "./product-fitment-rules.controller.js";
import {
  createProductFitmentRuleSchema,
  productFitmentRuleIdParamSchema,
  productFitmentRuleProductIdParamSchema,
  productFitmentRuleResponseSchema,
} from "./product-fitment-rules.schema.js";

export const productFitmentRulesRouter = Router({ mergeParams: true });

productFitmentRulesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

productFitmentRulesRouter.get(
  "/",
  validate(productFitmentRuleProductIdParamSchema, "params"),
  productFitmentRulesController.list,
);
productFitmentRulesRouter.post(
  "/",
  validate(productFitmentRuleProductIdParamSchema, "params"),
  validate(createProductFitmentRuleSchema),
  productFitmentRulesController.create,
);
productFitmentRulesRouter.delete(
  "/:id",
  validate(productFitmentRuleIdParamSchema, "params"),
  productFitmentRulesController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(productFitmentRuleResponseSchema) });
const itemResponse = z.object({ item: productFitmentRuleResponseSchema });

registry.registerPath({
  method: "get",
  path: "/products/{productId}/fitment-rules",
  tags: ["ProductFitmentRules"],
  summary: "List compatibility rules (category/spec/all) for a product",
  security,
  request: { params: productFitmentRuleProductIdParamSchema },
  responses: {
    200: { description: "Rules", content: { "application/json": { schema: listResponse } } },
    404: { description: "Product not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/products/{productId}/fitment-rules",
  tags: ["ProductFitmentRules"],
  summary: "Add a compatibility rule for a product",
  security,
  request: {
    params: productFitmentRuleProductIdParamSchema,
    body: { content: { "application/json": { schema: createProductFitmentRuleSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid category/spec value", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Product not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Already added", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/products/{productId}/fitment-rules/{id}",
  tags: ["ProductFitmentRules"],
  summary: "Remove a compatibility rule",
  security,
  request: { params: productFitmentRuleIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

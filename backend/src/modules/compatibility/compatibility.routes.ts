import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as compatibilityController from "./compatibility.controller.js";
import {
  compatibilityItemResponseSchema,
  compatibilityProductIdParamSchema,
  compatibleVehicleResponseSchema,
  listCompatibilityQuerySchema,
} from "./compatibility.schema.js";

export const compatibilityRouter = Router();

// Pure admin tooling (unified view across every product's fitments/rules) —
// unlike the per-product fitment routes it's built from, there is no
// customer-facing use for this, so the whole router is admin-gated, same
// pattern as promo-codes.routes.ts.
compatibilityRouter.use(requireAuth, requireRole(ROLES.ADMIN));

compatibilityRouter.get("/", validate(listCompatibilityQuerySchema, "query"), compatibilityController.list);
compatibilityRouter.get(
  "/products/:productId/vehicles",
  validate(compatibilityProductIdParamSchema, "params"),
  compatibilityController.listVehiclesForProduct,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(compatibilityItemResponseSchema) });
const vehiclesResponse = z.object({ items: z.array(compatibleVehicleResponseSchema) });

registry.registerPath({
  method: "get",
  path: "/compatibility",
  tags: ["Compatibility"],
  summary: "List every ProductFitment + ProductFitmentRule across every product as one flat, filterable list (admin only)",
  security,
  request: { query: listCompatibilityQuerySchema },
  responses: {
    200: { description: "Compatibility items", content: { "application/json": { schema: listResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/compatibility/products/{productId}/vehicles",
  tags: ["Compatibility"],
  summary: "Resolve every VehicleCatalog entry compatible with a product (explicit fitments union rule matches) (admin only)",
  security,
  request: { params: compatibilityProductIdParamSchema },
  responses: {
    200: { description: "Compatible vehicles", content: { "application/json": { schema: vehiclesResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Product not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

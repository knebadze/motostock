import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import { vehicleListingDiscountResponseSchema } from "../vehicle-listing-discounts/vehicle-listing-discounts.schema.js";
import * as bulkVehicleListingDiscountsController from "./bulk-vehicle-listing-discounts.controller.js";
import {
  bulkApplyVehicleListingDiscountsSchema,
  bulkVehicleDiscountCandidateResponseSchema,
  bulkVehicleDiscountCandidatesQuerySchema,
} from "./bulk-vehicle-listing-discounts.schema.js";

export const bulkVehicleListingDiscountsRouter = Router();

bulkVehicleListingDiscountsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

bulkVehicleListingDiscountsRouter.get(
  "/candidates",
  validate(bulkVehicleDiscountCandidatesQuerySchema, "query"),
  bulkVehicleListingDiscountsController.listCandidates,
);
bulkVehicleListingDiscountsRouter.post(
  "/apply",
  validate(bulkApplyVehicleListingDiscountsSchema),
  bulkVehicleListingDiscountsController.apply,
);

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: "get",
  path: "/bulk-vehicle-listing-discounts/candidates",
  tags: ["BulkVehicleListingDiscounts"],
  summary: "List vehicle listings in a category (+ descendants) eligible for a bulk discount",
  security,
  request: { query: bulkVehicleDiscountCandidatesQuerySchema },
  responses: {
    200: {
      description: "Candidates",
      content: {
        "application/json": { schema: z.object({ items: z.array(bulkVehicleDiscountCandidateResponseSchema) }) },
      },
    },
    400: { description: "Invalid category", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/bulk-vehicle-listing-discounts/apply",
  tags: ["BulkVehicleListingDiscounts"],
  summary: "Create a VehicleListingDiscount for every selected listing at one percentage",
  security,
  request: { body: { content: { "application/json": { schema: bulkApplyVehicleListingDiscountsSchema } } } },
  responses: {
    201: {
      description: "Created",
      content: { "application/json": { schema: z.object({ items: z.array(vehicleListingDiscountResponseSchema) }) } },
    },
    400: { description: "Invalid input", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import { productVariantDiscountResponseSchema } from "../product-variant-discounts/product-variant-discounts.schema.js";
import { vehicleListingDiscountResponseSchema } from "../vehicle-listing-discounts/vehicle-listing-discounts.schema.js";
import * as bulkDiscountsController from "./bulk-discounts.controller.js";
import {
  bulkApplyDiscountsSchema,
  bulkDiscountCandidateResponseSchema,
  bulkDiscountCandidatesQuerySchema,
  bulkVehicleDiscountCandidateResponseSchema,
  listDiscountHistoryQuerySchema,
  productDiscountHistoryRowSchema,
  vehicleDiscountHistoryRowSchema,
} from "./bulk-discounts.schema.js";

export const bulkDiscountsRouter = Router();

bulkDiscountsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

bulkDiscountsRouter.get(
  "/candidates",
  validate(bulkDiscountCandidatesQuerySchema, "query"),
  bulkDiscountsController.listCandidates,
);
bulkDiscountsRouter.post("/apply", validate(bulkApplyDiscountsSchema), bulkDiscountsController.apply);
bulkDiscountsRouter.get(
  "/discounts",
  validate(listDiscountHistoryQuerySchema, "query"),
  bulkDiscountsController.listDiscounts,
);

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: "get",
  path: "/bulk-discounts/candidates",
  tags: ["BulkDiscounts"],
  summary:
    "List variants (targetType=PRODUCT) or vehicle listings (targetType=VEHICLE_LISTING) in a category (+ descendants) eligible for a bulk discount",
  security,
  request: { query: bulkDiscountCandidatesQuerySchema },
  responses: {
    200: {
      description: "Candidates",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(z.union([bulkDiscountCandidateResponseSchema, bulkVehicleDiscountCandidateResponseSchema])),
          }),
        },
      },
    },
    400: { description: "Invalid category", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/bulk-discounts/discounts",
  tags: ["BulkDiscounts"],
  summary: "List all product variant or vehicle listing discounts (active + history, filterable)",
  security,
  request: { query: listDiscountHistoryQuerySchema },
  responses: {
    200: {
      description: "Discounts",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(z.union([productDiscountHistoryRowSchema, vehicleDiscountHistoryRowSchema])),
            total: z.int(),
            truncated: z.boolean(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/bulk-discounts/apply",
  tags: ["BulkDiscounts"],
  summary:
    "Create a ProductVariantDiscount (targetType=PRODUCT) or VehicleListingDiscount (targetType=VEHICLE_LISTING) for every selected item at one percentage",
  security,
  request: { body: { content: { "application/json": { schema: bulkApplyDiscountsSchema } } } },
  responses: {
    201: {
      description: "Created",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(z.union([productVariantDiscountResponseSchema, vehicleListingDiscountResponseSchema])),
            eventId: z.int().nullable(),
          }),
        },
      },
    },
    400: { description: "Invalid input", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

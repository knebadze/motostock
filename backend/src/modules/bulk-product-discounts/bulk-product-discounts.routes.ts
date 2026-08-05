import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import { productVariantDiscountResponseSchema } from "../product-variant-discounts/product-variant-discounts.schema.js";
import * as bulkProductDiscountsController from "./bulk-product-discounts.controller.js";
import {
  bulkApplyProductDiscountsSchema,
  bulkDiscountCandidateResponseSchema,
  bulkDiscountCandidatesQuerySchema,
  listProductDiscountHistoryQuerySchema,
  productDiscountHistoryRowSchema,
} from "./bulk-product-discounts.schema.js";

export const bulkProductDiscountsRouter = Router();

bulkProductDiscountsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

bulkProductDiscountsRouter.get(
  "/candidates",
  validate(bulkDiscountCandidatesQuerySchema, "query"),
  bulkProductDiscountsController.listCandidates,
);
bulkProductDiscountsRouter.post(
  "/apply",
  validate(bulkApplyProductDiscountsSchema),
  bulkProductDiscountsController.apply,
);
bulkProductDiscountsRouter.get(
  "/discounts",
  validate(listProductDiscountHistoryQuerySchema, "query"),
  bulkProductDiscountsController.listDiscounts,
);

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: "get",
  path: "/bulk-product-discounts/candidates",
  tags: ["BulkProductDiscounts"],
  summary: "List variants in a category (+ descendants) eligible for a bulk discount",
  security,
  request: { query: bulkDiscountCandidatesQuerySchema },
  responses: {
    200: {
      description: "Candidates",
      content: { "application/json": { schema: z.object({ items: z.array(bulkDiscountCandidateResponseSchema) }) } },
    },
    400: { description: "Invalid category", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/bulk-product-discounts/discounts",
  tags: ["BulkProductDiscounts"],
  summary: "List all product variant discounts (active + history, filterable)",
  security,
  request: { query: listProductDiscountHistoryQuerySchema },
  responses: {
    200: {
      description: "Discounts",
      content: { "application/json": { schema: z.object({ items: z.array(productDiscountHistoryRowSchema) }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/bulk-product-discounts/apply",
  tags: ["BulkProductDiscounts"],
  summary: "Create a ProductVariantDiscount for every selected variant at one percentage",
  security,
  request: { body: { content: { "application/json": { schema: bulkApplyProductDiscountsSchema } } } },
  responses: {
    201: {
      description: "Created",
      content: { "application/json": { schema: z.object({ items: z.array(productVariantDiscountResponseSchema) }) } },
    },
    400: { description: "Invalid input", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

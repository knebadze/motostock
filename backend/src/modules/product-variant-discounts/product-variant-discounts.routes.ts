import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as productVariantDiscountsController from "./product-variant-discounts.controller.js";
import {
  createProductVariantDiscountSchema,
  productVariantDiscountIdParamSchema,
  productVariantDiscountResponseSchema,
  productVariantDiscountVariantIdParamSchema,
  updateProductVariantDiscountSchema,
} from "./product-variant-discounts.schema.js";

export const productVariantDiscountsRouter = Router({ mergeParams: true });

productVariantDiscountsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

productVariantDiscountsRouter.get(
  "/",
  validate(productVariantDiscountVariantIdParamSchema, "params"),
  productVariantDiscountsController.list,
);
productVariantDiscountsRouter.post(
  "/",
  validate(productVariantDiscountVariantIdParamSchema, "params"),
  validate(createProductVariantDiscountSchema),
  productVariantDiscountsController.create,
);
productVariantDiscountsRouter.patch(
  "/:id",
  validate(productVariantDiscountIdParamSchema, "params"),
  validate(updateProductVariantDiscountSchema),
  productVariantDiscountsController.update,
);
productVariantDiscountsRouter.delete(
  "/:id",
  validate(productVariantDiscountIdParamSchema, "params"),
  productVariantDiscountsController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(productVariantDiscountResponseSchema) });
const itemResponse = z.object({ item: productVariantDiscountResponseSchema });

registry.registerPath({
  method: "get",
  path: "/product-variants/{variantId}/discounts",
  tags: ["ProductVariantDiscounts"],
  summary: "List discount periods for a product variant",
  security,
  request: { params: productVariantDiscountVariantIdParamSchema },
  responses: {
    200: { description: "Discounts", content: { "application/json": { schema: listResponse } } },
    404: { description: "Variant not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/product-variants/{variantId}/discounts",
  tags: ["ProductVariantDiscounts"],
  summary: "Create a discount period for a product variant",
  security,
  request: {
    params: productVariantDiscountVariantIdParamSchema,
    body: { content: { "application/json": { schema: createProductVariantDiscountSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid dates", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Variant not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/product-variants/{variantId}/discounts/{id}",
  tags: ["ProductVariantDiscounts"],
  summary: "Update a discount period",
  security,
  request: {
    params: productVariantDiscountIdParamSchema,
    body: { content: { "application/json": { schema: updateProductVariantDiscountSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid dates", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/product-variants/{variantId}/discounts/{id}",
  tags: ["ProductVariantDiscounts"],
  summary: "Delete a discount period",
  security,
  request: { params: productVariantDiscountIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

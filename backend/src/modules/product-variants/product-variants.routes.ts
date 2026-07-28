import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as productVariantsController from "./product-variants.controller.js";
import {
  createProductVariantSchema,
  productVariantIdParamSchema,
  productVariantListQuerySchema,
  productVariantResponseSchema,
  updateProductVariantSchema,
} from "./product-variants.schema.js";

export const productVariantsRouter = Router();

productVariantsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

productVariantsRouter.get(
  "/",
  validate(productVariantListQuerySchema, "query"),
  productVariantsController.list,
);
productVariantsRouter.get(
  "/:id",
  validate(productVariantIdParamSchema, "params"),
  productVariantsController.getOne,
);
productVariantsRouter.post("/", validate(createProductVariantSchema), productVariantsController.create);
productVariantsRouter.patch(
  "/:id",
  validate(productVariantIdParamSchema, "params"),
  validate(updateProductVariantSchema),
  productVariantsController.update,
);
productVariantsRouter.delete(
  "/:id",
  validate(productVariantIdParamSchema, "params"),
  productVariantsController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(productVariantResponseSchema) });
const itemResponse = z.object({ item: productVariantResponseSchema });

registry.registerPath({
  method: "get",
  path: "/product-variants",
  tags: ["ProductVariants"],
  summary: "List product variants, optionally scoped to a product",
  security,
  request: { query: productVariantListQuerySchema },
  responses: {
    200: { description: "Variants list", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/product-variants/{id}",
  tags: ["ProductVariants"],
  summary: "Get a product variant by id",
  security,
  request: { params: productVariantIdParamSchema },
  responses: {
    200: { description: "Variant", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/product-variants",
  tags: ["ProductVariants"],
  summary: "Create a product variant",
  security,
  request: { body: { content: { "application/json": { schema: createProductVariantSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid references", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/product-variants/{id}",
  tags: ["ProductVariants"],
  summary: "Update a product variant",
  security,
  request: {
    params: productVariantIdParamSchema,
    body: { content: { "application/json": { schema: updateProductVariantSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid references", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/product-variants/{id}",
  tags: ["ProductVariants"],
  summary: "Delete a product variant",
  security,
  request: { params: productVariantIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "In use, cannot delete", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

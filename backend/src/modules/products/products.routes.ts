import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as productsController from "./products.controller.js";
import {
  createProductSchema,
  productIdParamSchema,
  productListQuerySchema,
  productResponseSchema,
  updateProductSchema,
} from "./products.schema.js";

export const productsRouter = Router();

// Public: the guest shop page reads these two. Everything else stays admin-only.
productsRouter.get("/", validate(productListQuerySchema, "query"), productsController.list);
productsRouter.get("/:id", validate(productIdParamSchema, "params"), productsController.getOne);

productsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

productsRouter.post("/", validate(createProductSchema), productsController.create);
productsRouter.patch(
  "/:id",
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  productsController.update,
);
productsRouter.delete(
  "/:id",
  validate(productIdParamSchema, "params"),
  productsController.remove,
);
productsRouter.post(
  "/:id/image",
  validate(productIdParamSchema, "params"),
  imageUpload().single("image"),
  productsController.uploadImage,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(productResponseSchema) });
const itemResponse = z.object({ item: productResponseSchema });

registry.registerPath({
  method: "get",
  path: "/products",
  tags: ["Products"],
  summary: "List products, optionally scoped to a category (public — guest shop page)",
  request: { query: productListQuerySchema },
  responses: {
    200: { description: "Products list", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/{id}",
  tags: ["Products"],
  summary: "Get a product by id (public)",
  request: { params: productIdParamSchema },
  responses: {
    200: { description: "Product", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/products",
  tags: ["Products"],
  summary: "Create a product",
  security,
  request: { body: { content: { "application/json": { schema: createProductSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid category/brand/attribute values", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/products/{id}",
  tags: ["Products"],
  summary: "Update a product",
  security,
  request: {
    params: productIdParamSchema,
    body: { content: { "application/json": { schema: updateProductSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/products/{id}",
  tags: ["Products"],
  summary: "Delete a product",
  security,
  request: { params: productIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "Product in use", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/products/{id}/image",
  tags: ["Products"],
  summary: "Upload a product image",
  security,
  request: {
    params: productIdParamSchema,
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ image: z.string().openapi({ format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    200: { description: "Uploaded", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

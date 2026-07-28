import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as productBrandsController from "./product-brands.controller.js";
import {
  createProductBrandSchema,
  productBrandIdParamSchema,
  productBrandListQuerySchema,
  productBrandResponseSchema,
  updateProductBrandSchema,
} from "./product-brands.schema.js";

export const productBrandsRouter = Router();

productBrandsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

productBrandsRouter.get(
  "/",
  validate(productBrandListQuerySchema, "query"),
  productBrandsController.list,
);
productBrandsRouter.get(
  "/:id",
  validate(productBrandIdParamSchema, "params"),
  productBrandsController.getOne,
);
productBrandsRouter.post("/", validate(createProductBrandSchema), productBrandsController.create);
productBrandsRouter.patch(
  "/:id",
  validate(productBrandIdParamSchema, "params"),
  validate(updateProductBrandSchema),
  productBrandsController.update,
);
productBrandsRouter.delete(
  "/:id",
  validate(productBrandIdParamSchema, "params"),
  productBrandsController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(productBrandResponseSchema) });
const itemResponse = z.object({ item: productBrandResponseSchema });

registry.registerPath({
  method: "get",
  path: "/product-brands",
  tags: ["ProductBrands"],
  summary: "List product brands, optionally scoped to a category (including inherited from ancestors)",
  security,
  request: { query: productBrandListQuerySchema },
  responses: {
    200: { description: "Product brands list", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/product-brands/{id}",
  tags: ["ProductBrands"],
  summary: "Get a product brand by id",
  security,
  request: { params: productBrandIdParamSchema },
  responses: {
    200: { description: "Product brand", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/product-brands",
  tags: ["ProductBrands"],
  summary: "Create a product brand",
  security,
  request: { body: { content: { "application/json": { schema: createProductBrandSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid category", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Slug already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/product-brands/{id}",
  tags: ["ProductBrands"],
  summary: "Update a product brand",
  security,
  request: {
    params: productBrandIdParamSchema,
    body: { content: { "application/json": { schema: updateProductBrandSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Slug already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/product-brands/{id}",
  tags: ["ProductBrands"],
  summary: "Delete a product brand",
  security,
  request: { params: productBrandIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "Brand in use", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

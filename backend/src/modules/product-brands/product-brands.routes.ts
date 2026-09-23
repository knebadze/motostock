import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { uploadRateLimit } from "../../middleware/rateLimit.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
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

productBrandsRouter.use(requireAuth);

// GET routes widened to OPERATOR — the Products page's brand filter dropdown
// (getProductBrandsFromServer) needs this to not silently show empty for
// that role (its `fallback: []` was swallowing the 403 with no visible
// error). Writes stay ADMIN-only, same split as every other un-blanketed
// router this session.
productBrandsRouter.get(
  "/",
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  validate(productBrandListQuerySchema, "query"),
  productBrandsController.list,
);
productBrandsRouter.get(
  "/:id",
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  validate(productBrandIdParamSchema, "params"),
  productBrandsController.getOne,
);
productBrandsRouter.post(
  "/",
  requireRole(ROLES.ADMIN),
  validate(createProductBrandSchema),
  productBrandsController.create,
);
productBrandsRouter.patch(
  "/:id",
  requireRole(ROLES.ADMIN),
  validate(productBrandIdParamSchema, "params"),
  validate(updateProductBrandSchema),
  productBrandsController.update,
);
productBrandsRouter.delete(
  "/:id",
  requireRole(ROLES.ADMIN),
  validate(productBrandIdParamSchema, "params"),
  productBrandsController.remove,
);
productBrandsRouter.post(
  "/:id/logo",
  requireRole(ROLES.ADMIN),
  uploadRateLimit,
  validate(productBrandIdParamSchema, "params"),
  imageUpload().single("logo"),
  productBrandsController.uploadLogo,
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

registry.registerPath({
  method: "post",
  path: "/product-brands/{id}/logo",
  tags: ["ProductBrands"],
  summary: "Upload a product brand logo",
  security,
  request: {
    params: productBrandIdParamSchema,
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ logo: z.string().openapi({ format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    200: { description: "Uploaded", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid file", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

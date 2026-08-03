import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as brandsController from "./brands.controller.js";
import {
  brandIdParamSchema,
  brandResponseSchema,
  createBrandSchema,
  updateBrandSchema,
} from "./brands.schema.js";

export const brandsRouter = Router();

brandsRouter.get("/", brandsController.list);
brandsRouter.get("/:id", validate(brandIdParamSchema, "params"), brandsController.getOne);

brandsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

brandsRouter.post("/", validate(createBrandSchema), brandsController.create);
brandsRouter.patch(
  "/:id",
  validate(brandIdParamSchema, "params"),
  validate(updateBrandSchema),
  brandsController.update,
);
brandsRouter.delete("/:id", validate(brandIdParamSchema, "params"), brandsController.remove);
brandsRouter.post(
  "/:id/logo",
  validate(brandIdParamSchema, "params"),
  imageUpload().single("logo"),
  brandsController.uploadLogo,
);

const security = [{ cookieAuth: [] }];
const brandListResponse = z.object({ brands: z.array(brandResponseSchema) });
const brandWrapperResponse = z.object({ brand: brandResponseSchema });

registry.registerPath({
  method: "get",
  path: "/brands",
  tags: ["Brands"],
  summary: "List all brands",
  responses: {
    200: { description: "Brands list", content: { "application/json": { schema: brandListResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/brands/{id}",
  tags: ["Brands"],
  summary: "Get a brand by id",
  request: { params: brandIdParamSchema },
  responses: {
    200: { description: "Brand", content: { "application/json": { schema: brandWrapperResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/brands",
  tags: ["Brands"],
  summary: "Create a brand",
  security,
  request: { body: { content: { "application/json": { schema: createBrandSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: brandWrapperResponse } } },
    409: { description: "Slug already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/brands/{id}",
  tags: ["Brands"],
  summary: "Update a brand",
  security,
  request: {
    params: brandIdParamSchema,
    body: { content: { "application/json": { schema: updateBrandSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: brandWrapperResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Slug already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/brands/{id}",
  tags: ["Brands"],
  summary: "Delete a brand",
  security,
  request: { params: brandIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "Brand in use", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/brands/{id}/logo",
  tags: ["Brands"],
  summary: "Upload a brand logo",
  security,
  request: {
    params: brandIdParamSchema,
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ logo: z.string().openapi({ format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    200: { description: "Uploaded", content: { "application/json": { schema: brandWrapperResponse } } },
    400: { description: "Invalid file", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as categoriesController from "./categories.controller.js";
import {
  categoryIdParamSchema,
  categoryResponseSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./categories.schema.js";

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

categoriesRouter.get("/", categoriesController.list);
categoriesRouter.get(
  "/:id",
  validate(categoryIdParamSchema, "params"),
  categoriesController.getOne,
);
categoriesRouter.post(
  "/",
  validate(createCategorySchema),
  categoriesController.create,
);
categoriesRouter.patch(
  "/:id",
  validate(categoryIdParamSchema, "params"),
  validate(updateCategorySchema),
  categoriesController.update,
);
categoriesRouter.delete(
  "/:id",
  validate(categoryIdParamSchema, "params"),
  categoriesController.remove,
);
categoriesRouter.post(
  "/:id/image",
  validate(categoryIdParamSchema, "params"),
  imageUpload("categories").single("image"),
  categoriesController.uploadImage,
);

const security = [{ cookieAuth: [] }];
const categoryListResponse = z.object({ category: categoryResponseSchema });

registry.registerPath({
  method: "get",
  path: "/categories",
  tags: ["Categories"],
  summary: "List all categories",
  security,
  responses: {
    200: {
      description: "Categories list",
      content: {
        "application/json": {
          schema: z.object({ categories: z.array(categoryResponseSchema) }),
        },
      },
    },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/categories/{id}",
  tags: ["Categories"],
  summary: "Get a category by id",
  security,
  request: { params: categoryIdParamSchema },
  responses: {
    200: { description: "Category", content: { "application/json": { schema: categoryListResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/categories",
  tags: ["Categories"],
  summary: "Create a category",
  security,
  request: {
    body: { content: { "application/json": { schema: createCategorySchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: categoryListResponse } } },
    400: { description: "Invalid parent", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Slug already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/categories/{id}",
  tags: ["Categories"],
  summary: "Update a category",
  security,
  request: {
    params: categoryIdParamSchema,
    body: { content: { "application/json": { schema: updateCategorySchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: categoryListResponse } } },
    400: { description: "Invalid parent or cycle", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Slug already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/categories/{id}",
  tags: ["Categories"],
  summary: "Delete a category",
  security,
  request: { params: categoryIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "Category has subcategories", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/categories/{id}/image",
  tags: ["Categories"],
  summary: "Upload a category image",
  security,
  request: {
    params: categoryIdParamSchema,
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({ image: z.string().openapi({ format: "binary" }) }),
        },
      },
    },
  },
  responses: {
    200: { description: "Uploaded", content: { "application/json": { schema: categoryListResponse } } },
    400: { description: "Invalid file", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

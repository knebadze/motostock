import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as tagsController from "./tags.controller.js";
import {
  bulkTagProductsResponseSchema,
  bulkTagProductsSchema,
  createTagSchema,
  productIdParamSchema,
  productTagRefSchema,
  setProductTagsSchema,
  tagIdParamSchema,
  tagProductSchema,
  tagResponseSchema,
  updateTagSchema,
} from "./tags.schema.js";

// Same role split as buy-together/products: OPERATOR can read (the admin
// tags page and product form show them), only ADMIN writes.
export const tagsRouter = Router();
tagsRouter.use(requireAuth);

tagsRouter.get("/", requireRole(ROLES.ADMIN, ROLES.OPERATOR), tagsController.list);
tagsRouter.post("/", requireRole(ROLES.ADMIN), validate(createTagSchema), tagsController.create);
tagsRouter.patch(
  "/:id",
  requireRole(ROLES.ADMIN),
  validate(tagIdParamSchema, "params"),
  validate(updateTagSchema),
  tagsController.update,
);
tagsRouter.delete("/:id", requireRole(ROLES.ADMIN), validate(tagIdParamSchema, "params"), tagsController.remove);
tagsRouter.get(
  "/:id/products",
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  validate(tagIdParamSchema, "params"),
  tagsController.listProducts,
);

// Bulk assign/remove (admin products list selection).
tagsRouter.post(
  "/:id/products/assign",
  requireRole(ROLES.ADMIN),
  validate(tagIdParamSchema, "params"),
  validate(bulkTagProductsSchema),
  tagsController.addToProducts,
);
tagsRouter.post(
  "/:id/products/unassign",
  requireRole(ROLES.ADMIN),
  validate(tagIdParamSchema, "params"),
  validate(bulkTagProductsSchema),
  tagsController.removeFromProducts,
);

// Mounted at /api/products/:productId/tags.
export const productTagsRouter = Router({ mergeParams: true });
productTagsRouter.use(requireAuth);

productTagsRouter.get(
  "/",
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  validate(productIdParamSchema, "params"),
  tagsController.getProductTags,
);
productTagsRouter.put(
  "/",
  requireRole(ROLES.ADMIN),
  validate(productIdParamSchema, "params"),
  validate(setProductTagsSchema),
  tagsController.setProductTags,
);

const security = [{ cookieAuth: [] }];
const tagItem = z.object({ item: tagResponseSchema });
const productTagList = z.object({ items: z.array(productTagRefSchema) });

registry.registerPath({
  method: "get",
  path: "/tags",
  tags: ["Tags"],
  summary: "List buy-together tags with product counts (admin/operator)",
  security,
  responses: {
    200: { description: "Tags", content: { "application/json": { schema: z.object({ items: z.array(tagResponseSchema) }) } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/tags",
  tags: ["Tags"],
  summary: "Create a tag",
  security,
  request: { body: { content: { "application/json": { schema: createTagSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: tagItem } } },
    409: { description: "Duplicate name", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/tags/{id}",
  tags: ["Tags"],
  summary: "Update a tag",
  security,
  request: { params: tagIdParamSchema, body: { content: { "application/json": { schema: updateTagSchema } } } },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: tagItem } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Duplicate name", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/tags/{id}",
  tags: ["Tags"],
  summary: "Delete a tag (also removes it from every product)",
  security,
  request: { params: tagIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/tags/{id}/products",
  tags: ["Tags"],
  summary: "Products carrying a tag (the kit preview)",
  security,
  request: { params: tagIdParamSchema },
  responses: {
    200: { description: "Products", content: { "application/json": { schema: z.object({ items: z.array(tagProductSchema) }) } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/{productId}/tags",
  tags: ["Tags"],
  summary: "A product's tags",
  security,
  request: { params: productIdParamSchema },
  responses: {
    200: { description: "Tags", content: { "application/json": { schema: productTagList } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/products/{productId}/tags",
  tags: ["Tags"],
  summary: "Replace a product's tag set",
  security,
  request: {
    params: productIdParamSchema,
    body: { content: { "application/json": { schema: setProductTagsSchema } } },
  },
  responses: {
    200: { description: "Updated tags", content: { "application/json": { schema: productTagList } } },
    400: { description: "Unknown tag", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/tags/{id}/products/assign",
  tags: ["Tags"],
  summary: "Add a tag to many products (already-tagged ones are skipped)",
  security,
  request: {
    params: tagIdParamSchema,
    body: { content: { "application/json": { schema: bulkTagProductsSchema } } },
  },
  responses: {
    200: { description: "Done", content: { "application/json": { schema: bulkTagProductsResponseSchema } } },
    400: { description: "Unknown product", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Tag not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/tags/{id}/products/unassign",
  tags: ["Tags"],
  summary: "Remove a tag from many products",
  security,
  request: {
    params: tagIdParamSchema,
    body: { content: { "application/json": { schema: bulkTagProductsSchema } } },
  },
  responses: {
    200: { description: "Done", content: { "application/json": { schema: bulkTagProductsResponseSchema } } },
    400: { description: "Unknown product", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Tag not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

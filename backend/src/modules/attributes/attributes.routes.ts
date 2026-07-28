import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as attributesController from "./attributes.controller.js";
import {
  attributeIdParamSchema,
  attributeListQuerySchema,
  attributeResponseSchema,
  createAttributeSchema,
  updateAttributeSchema,
} from "./attributes.schema.js";

export const attributesRouter = Router();

attributesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

attributesRouter.get("/", validate(attributeListQuerySchema, "query"), attributesController.list);
attributesRouter.get(
  "/:id",
  validate(attributeIdParamSchema, "params"),
  attributesController.getOne,
);
attributesRouter.post("/", validate(createAttributeSchema), attributesController.create);
attributesRouter.patch(
  "/:id",
  validate(attributeIdParamSchema, "params"),
  validate(updateAttributeSchema),
  attributesController.update,
);
attributesRouter.delete(
  "/:id",
  validate(attributeIdParamSchema, "params"),
  attributesController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(attributeResponseSchema) });
const itemResponse = z.object({ item: attributeResponseSchema });

registry.registerPath({
  method: "get",
  path: "/attributes",
  tags: ["Attributes"],
  summary: "List attributes, optionally scoped to a category (including inherited from ancestors)",
  security,
  request: { query: attributeListQuerySchema },
  responses: {
    200: { description: "Attributes list", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/attributes/{id}",
  tags: ["Attributes"],
  summary: "Get an attribute by id",
  security,
  request: { params: attributeIdParamSchema },
  responses: {
    200: { description: "Attribute", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/attributes",
  tags: ["Attributes"],
  summary: "Create an attribute",
  security,
  request: { body: { content: { "application/json": { schema: createAttributeSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid category", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/attributes/{id}",
  tags: ["Attributes"],
  summary: "Update an attribute",
  security,
  request: {
    params: attributeIdParamSchema,
    body: { content: { "application/json": { schema: updateAttributeSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/attributes/{id}",
  tags: ["Attributes"],
  summary: "Delete an attribute",
  security,
  request: { params: attributeIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "Attribute in use", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

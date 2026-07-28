import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as attributeOptionsController from "./attribute-options.controller.js";
import {
  attributeOptionAttributeIdParamSchema,
  attributeOptionIdParamSchema,
  attributeOptionResponseSchema,
  createAttributeOptionSchema,
  updateAttributeOptionSchema,
} from "./attribute-options.schema.js";

export const attributeOptionsRouter = Router({ mergeParams: true });

attributeOptionsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

attributeOptionsRouter.get(
  "/",
  validate(attributeOptionAttributeIdParamSchema, "params"),
  attributeOptionsController.list,
);
attributeOptionsRouter.post(
  "/",
  validate(attributeOptionAttributeIdParamSchema, "params"),
  validate(createAttributeOptionSchema),
  attributeOptionsController.create,
);
attributeOptionsRouter.patch(
  "/:id",
  validate(attributeOptionIdParamSchema, "params"),
  validate(updateAttributeOptionSchema),
  attributeOptionsController.update,
);
attributeOptionsRouter.delete(
  "/:id",
  validate(attributeOptionIdParamSchema, "params"),
  attributeOptionsController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(attributeOptionResponseSchema) });
const itemResponse = z.object({ item: attributeOptionResponseSchema });

registry.registerPath({
  method: "get",
  path: "/attributes/{attributeId}/options",
  tags: ["AttributeOptions"],
  summary: "List options for a SELECT-type attribute",
  security,
  request: { params: attributeOptionAttributeIdParamSchema },
  responses: {
    200: { description: "Options", content: { "application/json": { schema: listResponse } } },
    404: { description: "Attribute not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/attributes/{attributeId}/options",
  tags: ["AttributeOptions"],
  summary: "Create an option for a SELECT-type attribute",
  security,
  request: {
    params: attributeOptionAttributeIdParamSchema,
    body: { content: { "application/json": { schema: createAttributeOptionSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Attribute not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Key already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/attributes/{attributeId}/options/{id}",
  tags: ["AttributeOptions"],
  summary: "Update an attribute option",
  security,
  request: {
    params: attributeOptionIdParamSchema,
    body: { content: { "application/json": { schema: updateAttributeOptionSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/attributes/{attributeId}/options/{id}",
  tags: ["AttributeOptions"],
  summary: "Delete an attribute option",
  security,
  request: { params: attributeOptionIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "Option in use", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

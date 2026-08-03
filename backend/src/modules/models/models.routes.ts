import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as modelsController from "./models.controller.js";
import {
  createModelSchema,
  modelIdParamSchema,
  modelListQuerySchema,
  modelResponseSchema,
  updateModelSchema,
} from "./models.schema.js";

export const modelsRouter = Router();

modelsRouter.get("/", modelsController.list);
modelsRouter.get("/:id", validate(modelIdParamSchema, "params"), modelsController.getOne);

modelsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

modelsRouter.post("/", validate(createModelSchema), modelsController.create);
modelsRouter.patch(
  "/:id",
  validate(modelIdParamSchema, "params"),
  validate(updateModelSchema),
  modelsController.update,
);
modelsRouter.delete("/:id", validate(modelIdParamSchema, "params"), modelsController.remove);

const security = [{ cookieAuth: [] }];
const modelListResponse = z.object({ models: z.array(modelResponseSchema) });
const modelWrapperResponse = z.object({ model: modelResponseSchema });

registry.registerPath({
  method: "get",
  path: "/models",
  tags: ["Models"],
  summary: "List all models, optionally filtered by brand",
  request: { query: modelListQuerySchema },
  responses: {
    200: { description: "Models list", content: { "application/json": { schema: modelListResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/models/{id}",
  tags: ["Models"],
  summary: "Get a model by id",
  request: { params: modelIdParamSchema },
  responses: {
    200: { description: "Model", content: { "application/json": { schema: modelWrapperResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/models",
  tags: ["Models"],
  summary: "Create a model",
  security,
  request: { body: { content: { "application/json": { schema: createModelSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: modelWrapperResponse } } },
    400: { description: "Invalid brand", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Slug already in use for this brand", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/models/{id}",
  tags: ["Models"],
  summary: "Update a model",
  security,
  request: {
    params: modelIdParamSchema,
    body: { content: { "application/json": { schema: updateModelSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: modelWrapperResponse } } },
    400: { description: "Invalid brand", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Slug already in use for this brand", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/models/{id}",
  tags: ["Models"],
  summary: "Delete a model",
  security,
  request: { params: modelIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "Model in use", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

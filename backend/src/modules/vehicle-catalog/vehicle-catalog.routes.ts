import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as vehicleCatalogController from "./vehicle-catalog.controller.js";
import {
  createVehicleCatalogSchema,
  updateVehicleCatalogSchema,
  vehicleCatalogIdParamSchema,
  vehicleCatalogListQuerySchema,
  vehicleCatalogResponseSchema,
} from "./vehicle-catalog.schema.js";

export const vehicleCatalogRouter = Router();

vehicleCatalogRouter.use(requireAuth, requireRole(ROLES.ADMIN));

vehicleCatalogRouter.get(
  "/",
  validate(vehicleCatalogListQuerySchema, "query"),
  vehicleCatalogController.list,
);
vehicleCatalogRouter.get(
  "/:id",
  validate(vehicleCatalogIdParamSchema, "params"),
  vehicleCatalogController.getOne,
);
vehicleCatalogRouter.post(
  "/",
  validate(createVehicleCatalogSchema),
  vehicleCatalogController.create,
);
vehicleCatalogRouter.patch(
  "/:id",
  validate(vehicleCatalogIdParamSchema, "params"),
  validate(updateVehicleCatalogSchema),
  vehicleCatalogController.update,
);
vehicleCatalogRouter.delete(
  "/:id",
  validate(vehicleCatalogIdParamSchema, "params"),
  vehicleCatalogController.remove,
);
vehicleCatalogRouter.post(
  "/:id/image",
  validate(vehicleCatalogIdParamSchema, "params"),
  imageUpload().single("image"),
  vehicleCatalogController.uploadImage,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(vehicleCatalogResponseSchema) });
const itemResponse = z.object({ item: vehicleCatalogResponseSchema });

registry.registerPath({
  method: "get",
  path: "/vehicle-catalog",
  tags: ["VehicleCatalog"],
  summary: "List all vehicle catalog entries",
  security,
  request: { query: vehicleCatalogListQuerySchema },
  responses: {
    200: { description: "Vehicle catalog list", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/vehicle-catalog/{id}",
  tags: ["VehicleCatalog"],
  summary: "Get a vehicle catalog entry by id",
  security,
  request: { params: vehicleCatalogIdParamSchema },
  responses: {
    200: { description: "Vehicle catalog entry", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/vehicle-catalog",
  tags: ["VehicleCatalog"],
  summary: "Create a vehicle catalog entry",
  security,
  request: { body: { content: { "application/json": { schema: createVehicleCatalogSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid references", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/vehicle-catalog/{id}",
  tags: ["VehicleCatalog"],
  summary: "Update a vehicle catalog entry",
  security,
  request: {
    params: vehicleCatalogIdParamSchema,
    body: { content: { "application/json": { schema: updateVehicleCatalogSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid references", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/vehicle-catalog/{id}",
  tags: ["VehicleCatalog"],
  summary: "Delete a vehicle catalog entry",
  security,
  request: { params: vehicleCatalogIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    400: { description: "In use, cannot delete", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/vehicle-catalog/{id}/image",
  tags: ["VehicleCatalog"],
  summary: "Upload a vehicle catalog image",
  security,
  request: {
    params: vehicleCatalogIdParamSchema,
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
    400: { description: "Invalid file", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

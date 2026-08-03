import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as garageController from "./garage.controller.js";
import {
  createGarageVehicleSchema,
  garageVehicleIdParamSchema,
  garageVehicleResponseSchema,
  updateGarageVehicleSchema,
} from "./garage.schema.js";

export const garageRouter = Router();

garageRouter.use(requireAuth);

garageRouter.get("/me/garage", garageController.list);
garageRouter.post("/me/garage", validate(createGarageVehicleSchema), garageController.create);
garageRouter.patch(
  "/me/garage/:id",
  validate(garageVehicleIdParamSchema, "params"),
  validate(updateGarageVehicleSchema),
  garageController.update,
);
garageRouter.delete(
  "/me/garage/:id",
  validate(garageVehicleIdParamSchema, "params"),
  garageController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(garageVehicleResponseSchema) });
const itemResponse = z.object({ item: garageVehicleResponseSchema });

registry.registerPath({
  method: "get",
  path: "/users/me/garage",
  tags: ["Garage"],
  summary: "List the currently authenticated user's garage vehicles",
  security,
  responses: {
    200: { description: "Garage vehicles", content: { "application/json": { schema: listResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/users/me/garage",
  tags: ["Garage"],
  summary: "Add an existing catalog vehicle to the caller's garage",
  security,
  request: { body: { content: { "application/json": { schema: createGarageVehicleSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid references", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/users/me/garage/{id}",
  tags: ["Garage"],
  summary: "Update one of the caller's garage vehicles",
  security,
  request: {
    params: garageVehicleIdParamSchema,
    body: { content: { "application/json": { schema: updateGarageVehicleSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid references", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/users/me/garage/{id}",
  tags: ["Garage"],
  summary: "Remove one of the caller's garage vehicles",
  security,
  request: { params: garageVehicleIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

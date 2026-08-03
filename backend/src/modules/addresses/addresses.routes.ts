import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as addressesController from "./addresses.controller.js";
import { addressResponseSchema, upsertAddressSchema } from "./addresses.schema.js";

export const addressesRouter = Router();

addressesRouter.use(requireAuth);

addressesRouter.get("/me/address", addressesController.getMine);
addressesRouter.put(
  "/me/address",
  validate(upsertAddressSchema),
  addressesController.saveMine,
);

const security = [{ cookieAuth: [] }];
const addressResponse = z.object({ address: addressResponseSchema.nullable() });

registry.registerPath({
  method: "get",
  path: "/users/me/address",
  tags: ["Addresses"],
  summary: "Get the currently authenticated user's primary address (null if not set)",
  security,
  responses: {
    200: { description: "Address", content: { "application/json": { schema: addressResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/users/me/address",
  tags: ["Addresses"],
  summary: "Create or replace the currently authenticated user's primary address",
  security,
  request: { body: { content: { "application/json": { schema: upsertAddressSchema } } } },
  responses: {
    200: { description: "Saved", content: { "application/json": { schema: addressResponse } } },
    400: { description: "Invalid city", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

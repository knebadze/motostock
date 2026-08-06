import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import * as addressesController from "./addresses.controller.js";
import {
  addressIdParamSchema,
  addressResponseSchema,
  createAddressSchema,
  updateAddressSchema,
} from "./addresses.schema.js";

export const addressesRouter = Router();

// Path-scoped (not a bare .use(requireAuth)) — addressesRouter shares the
// /api/users mount prefix with several other routers (garage, wishlist,
// ...); an unscoped .use() here would intercept and reject EVERY request
// under /api/users/*, including ones meant for those other routers, since
// Express dispatches same-prefix routers in mount order and a rejected
// request never reaches the next one. Scoping to this router's own path
// keeps it from swallowing traffic it doesn't own.
addressesRouter.use("/me/addresses", requireAuth);

addressesRouter.get("/me/addresses", addressesController.list);
addressesRouter.post(
  "/me/addresses",
  validate(createAddressSchema),
  addressesController.create,
);
addressesRouter.patch(
  "/me/addresses/:id",
  validate(addressIdParamSchema, "params"),
  validate(updateAddressSchema),
  addressesController.update,
);
addressesRouter.delete(
  "/me/addresses/:id",
  validate(addressIdParamSchema, "params"),
  addressesController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ addresses: z.array(addressResponseSchema) });
const itemResponse = z.object({ address: addressResponseSchema });

registry.registerPath({
  method: "get",
  path: "/users/me/addresses",
  tags: ["Addresses"],
  summary: "List the currently authenticated user's addresses",
  security,
  responses: {
    200: { description: "Addresses", content: { "application/json": { schema: listResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/users/me/addresses",
  tags: ["Addresses"],
  summary: "Add a new address for the currently authenticated user",
  security,
  request: { body: { content: { "application/json": { schema: createAddressSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid city", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/users/me/addresses/{id}",
  tags: ["Addresses"],
  summary: "Update one of the caller's addresses",
  security,
  request: {
    params: addressIdParamSchema,
    body: { content: { "application/json": { schema: updateAddressSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid city", content: { "application/json": { schema: errorResponseSchema } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/users/me/addresses/{id}",
  tags: ["Addresses"],
  summary: "Delete one of the caller's addresses",
  security,
  request: { params: addressIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

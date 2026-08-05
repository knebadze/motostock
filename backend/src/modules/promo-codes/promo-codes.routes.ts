import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as promoCodesController from "./promo-codes.controller.js";
import {
  createPromoCodeSchema,
  listPromoCodesQuerySchema,
  promoCodeIdParamSchema,
  promoCodeResponseSchema,
  updatePromoCodeSchema,
} from "./promo-codes.schema.js";

export const promoCodesRouter = Router();

promoCodesRouter.use(requireAuth, requireRole(ROLES.ADMIN));

promoCodesRouter.get("/", validate(listPromoCodesQuerySchema, "query"), promoCodesController.list);
promoCodesRouter.post("/", validate(createPromoCodeSchema), promoCodesController.create);
promoCodesRouter.get("/:id", validate(promoCodeIdParamSchema, "params"), promoCodesController.get);
promoCodesRouter.patch(
  "/:id",
  validate(promoCodeIdParamSchema, "params"),
  validate(updatePromoCodeSchema),
  promoCodesController.update,
);
promoCodesRouter.delete("/:id", validate(promoCodeIdParamSchema, "params"), promoCodesController.remove);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(promoCodeResponseSchema) });
const itemResponse = z.object({ item: promoCodeResponseSchema });

registry.registerPath({
  method: "get",
  path: "/promo-codes",
  tags: ["PromoCodes"],
  summary: "List promo codes for a domain (active + history, filterable)",
  security,
  request: { query: listPromoCodesQuerySchema },
  responses: {
    200: { description: "Promo codes", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/promo-codes",
  tags: ["PromoCodes"],
  summary: "Create a promo code",
  security,
  request: { body: { content: { "application/json": { schema: createPromoCodeSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid input", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Code already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/promo-codes/{id}",
  tags: ["PromoCodes"],
  summary: "Get a promo code",
  security,
  request: { params: promoCodeIdParamSchema },
  responses: {
    200: { description: "Promo code", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/promo-codes/{id}",
  tags: ["PromoCodes"],
  summary: "Update a promo code",
  security,
  request: {
    params: promoCodeIdParamSchema,
    body: { content: { "application/json": { schema: updatePromoCodeSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid input", content: { "application/json": { schema: errorResponseSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
    409: { description: "Code already in use", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/promo-codes/{id}",
  tags: ["PromoCodes"],
  summary: "Delete a promo code",
  security,
  request: { params: promoCodeIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

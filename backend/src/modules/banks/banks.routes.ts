import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { uploadRateLimit } from "../../middleware/rateLimit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as banksController from "./banks.controller.js";
import {
  bankIdParamSchema,
  bankResponseSchema,
  createBankSchema,
  publicBankResponseSchema,
  reorderBanksSchema,
  updateBankSchema,
} from "./banks.schema.js";

export const banksRouter = Router();

// Public — active banks only, no credentials (see banks.service.ts's
// toPublicResponse), for the checkout page's bank picker. Registered
// before the admin gate below, same narrow-public-endpoint pattern as
// /hero-slides/public.
banksRouter.get("/public", banksController.listPublic);

banksRouter.use(requireAuth, requireRole(ROLES.ADMIN));

banksRouter.get("/", banksController.list);
banksRouter.post("/", validate(createBankSchema), banksController.create);
banksRouter.patch(
  "/:id",
  validate(bankIdParamSchema, "params"),
  validate(updateBankSchema),
  banksController.update,
);
banksRouter.post(
  "/:id/logo",
  uploadRateLimit,
  validate(bankIdParamSchema, "params"),
  imageUpload().single("logo"),
  banksController.uploadLogo,
);
banksRouter.put("/order", validate(reorderBanksSchema), banksController.reorder);
banksRouter.delete("/:id", validate(bankIdParamSchema, "params"), banksController.remove);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(bankResponseSchema) });
const publicListResponse = z.object({ items: z.array(publicBankResponseSchema) });
const itemResponse = z.object({ item: bankResponseSchema });

registry.registerPath({
  method: "get",
  path: "/banks/public",
  tags: ["Banks"],
  summary: "List active banks the customer can pay through at checkout (public, no credentials)",
  responses: {
    200: { description: "Active banks", content: { "application/json": { schema: publicListResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/banks",
  tags: ["Banks"],
  summary: "List all banks, including inactive ones (admin)",
  security,
  responses: {
    200: { description: "Banks", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/banks",
  tags: ["Banks"],
  summary: "Create a bank",
  security,
  request: { body: { content: { "application/json": { schema: createBankSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid input or duplicate key", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/banks/{id}",
  tags: ["Banks"],
  summary: "Update a bank",
  security,
  request: {
    params: bankIdParamSchema,
    body: { content: { "application/json": { schema: updateBankSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/banks/{id}/logo",
  tags: ["Banks"],
  summary: "Upload a bank's logo",
  security,
  request: { params: bankIdParamSchema },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/banks/order",
  tags: ["Banks"],
  summary: "Reorder banks",
  security,
  request: { body: { content: { "application/json": { schema: reorderBanksSchema } } } },
  responses: {
    200: { description: "Reordered", content: { "application/json": { schema: listResponse } } },
    400: { description: "Id set mismatch", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/banks/{id}",
  tags: ["Banks"],
  summary: "Delete a bank",
  security,
  request: { params: bankIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

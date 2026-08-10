import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as termsController from "./terms.controller.js";
import { termsResponseSchema, updateTermsSchema } from "./terms.schema.js";

export const termsRouter = Router();

// Public: the guest /terms page reads this on every load — none of it is
// sensitive, it's meant for public display. Same public-GET/admin-write
// pattern as company-info.routes.ts.
termsRouter.get("/", termsController.getOne);

termsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

termsRouter.patch("/", validate(updateTermsSchema), termsController.update);

const security = [{ cookieAuth: [] }];
const termsWrapperResponse = z.object({ terms: termsResponseSchema });

registry.registerPath({
  method: "get",
  path: "/terms",
  tags: ["Terms"],
  summary: "Get the terms and conditions content (public)",
  responses: {
    200: {
      description: "Terms and conditions",
      content: { "application/json": { schema: termsWrapperResponse } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/terms",
  tags: ["Terms"],
  summary: "Update the terms and conditions content (admin only)",
  security,
  request: { body: { content: { "application/json": { schema: updateTermsSchema } } } },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: termsWrapperResponse } } },
    401: { description: "Not authenticated", content: { "application/json": { schema: errorResponseSchema } } },
    403: { description: "Insufficient permissions", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

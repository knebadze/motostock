import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as faqController from "./faq.controller.js";
import {
  createFaqSchema,
  faqIdParamSchema,
  faqResponseSchema,
  reorderFaqSchema,
  updateFaqSchema,
} from "./faq.schema.js";

export const faqRouter = Router();

// Public — active FAQ entries only, ordered for display on the guest FAQ
// page. Registered before the admin gate below, same narrow-public-endpoint
// pattern as /banks/public.
faqRouter.get("/public", faqController.listPublic);

faqRouter.use(requireAuth, requireRole(ROLES.ADMIN));

faqRouter.get("/", faqController.list);
faqRouter.post("/", validate(createFaqSchema), faqController.create);
faqRouter.patch(
  "/:id",
  validate(faqIdParamSchema, "params"),
  validate(updateFaqSchema),
  faqController.update,
);
faqRouter.put("/order", validate(reorderFaqSchema), faqController.reorder);
faqRouter.delete("/:id", validate(faqIdParamSchema, "params"), faqController.remove);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(faqResponseSchema) });
const itemResponse = z.object({ item: faqResponseSchema });

registry.registerPath({
  method: "get",
  path: "/faq/public",
  tags: ["Faq"],
  summary: "List active FAQ entries, ordered for display (public — guest FAQ page)",
  responses: {
    200: { description: "Active FAQ entries", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/faq",
  tags: ["Faq"],
  summary: "List all FAQ entries, including inactive ones (admin)",
  security,
  responses: {
    200: { description: "FAQ entries", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/faq",
  tags: ["Faq"],
  summary: "Create a FAQ entry",
  security,
  request: { body: { content: { "application/json": { schema: createFaqSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/faq/{id}",
  tags: ["Faq"],
  summary: "Update a FAQ entry",
  security,
  request: {
    params: faqIdParamSchema,
    body: { content: { "application/json": { schema: updateFaqSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/faq/order",
  tags: ["Faq"],
  summary: "Reorder FAQ entries",
  security,
  request: { body: { content: { "application/json": { schema: reorderFaqSchema } } } },
  responses: {
    200: { description: "Reordered", content: { "application/json": { schema: listResponse } } },
    400: { description: "Id set mismatch", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/faq/{id}",
  tags: ["Faq"],
  summary: "Delete a FAQ entry",
  security,
  request: { params: faqIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

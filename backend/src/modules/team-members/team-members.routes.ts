import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { uploadRateLimit } from "../../middleware/rateLimit.middleware.js";
import { imageUpload } from "../../middleware/upload.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as teamMembersController from "./team-members.controller.js";
import {
  createTeamMemberSchema,
  reorderTeamMembersSchema,
  teamMemberIdParamSchema,
  teamMemberResponseSchema,
  updateTeamMemberSchema,
} from "./team-members.schema.js";

export const teamMembersRouter = Router();

// Public — only active members, for the /about page. Registered before the
// admin gate below, same narrow-public-endpoint pattern as
// /hero-slides/public: the full admin resource (including inactive
// members) stays admin-only.
teamMembersRouter.get("/public", teamMembersController.listPublic);

teamMembersRouter.use(requireAuth, requireRole(ROLES.ADMIN));

teamMembersRouter.get("/", teamMembersController.list);
teamMembersRouter.post("/", validate(createTeamMemberSchema), teamMembersController.create);
teamMembersRouter.patch(
  "/:id",
  validate(teamMemberIdParamSchema, "params"),
  validate(updateTeamMemberSchema),
  teamMembersController.update,
);
teamMembersRouter.post(
  "/:id/image",
  uploadRateLimit,
  validate(teamMemberIdParamSchema, "params"),
  imageUpload().single("image"),
  teamMembersController.uploadImage,
);
teamMembersRouter.put(
  "/order",
  validate(reorderTeamMembersSchema),
  teamMembersController.reorder,
);
teamMembersRouter.delete(
  "/:id",
  validate(teamMemberIdParamSchema, "params"),
  teamMembersController.remove,
);

const security = [{ cookieAuth: [] }];
const listResponse = z.object({ items: z.array(teamMemberResponseSchema) });
const itemResponse = z.object({ item: teamMemberResponseSchema });

registry.registerPath({
  method: "get",
  path: "/team-members/public",
  tags: ["TeamMembers"],
  summary: "List active team members (public)",
  responses: {
    200: { description: "Active team members", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/team-members",
  tags: ["TeamMembers"],
  summary: "List all team members, including inactive ones (admin)",
  security,
  responses: {
    200: { description: "Team members", content: { "application/json": { schema: listResponse } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/team-members",
  tags: ["TeamMembers"],
  summary: "Create a team member",
  security,
  request: { body: { content: { "application/json": { schema: createTeamMemberSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: itemResponse } } },
    400: { description: "Invalid input", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/team-members/{id}",
  tags: ["TeamMembers"],
  summary: "Update a team member",
  security,
  request: {
    params: teamMemberIdParamSchema,
    body: { content: { "application/json": { schema: updateTeamMemberSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/team-members/{id}/image",
  tags: ["TeamMembers"],
  summary: "Upload a team member's photo",
  security,
  request: { params: teamMemberIdParamSchema },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: itemResponse } } },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "put",
  path: "/team-members/order",
  tags: ["TeamMembers"],
  summary: "Reorder team members",
  security,
  request: { body: { content: { "application/json": { schema: reorderTeamMembersSchema } } } },
  responses: {
    200: { description: "Reordered", content: { "application/json": { schema: listResponse } } },
    400: { description: "Id set mismatch", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "delete",
  path: "/team-members/{id}",
  tags: ["TeamMembers"],
  summary: "Delete a team member",
  security,
  request: { params: teamMemberIdParamSchema },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

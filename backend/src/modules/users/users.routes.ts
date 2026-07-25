import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema, userResponseSchema } from "../../docs/schemas.js";
import { me } from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, me);

registry.registerPath({
  method: "get",
  path: "/users/me",
  tags: ["Users"],
  summary: "Get the currently authenticated user",
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: "Current user",
      content: { "application/json": { schema: z.object({ user: userResponseSchema }) } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});

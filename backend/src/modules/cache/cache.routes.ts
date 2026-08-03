import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { registry } from "../../docs/registry.js";
import { ROLES } from "../../lib/roles.js";
import * as cacheController from "./cache.controller.js";

export const cacheRouter = Router();

cacheRouter.use(requireAuth, requireRole(ROLES.ADMIN));

cacheRouter.post("/clear", cacheController.clear);

const security = [{ cookieAuth: [] }];
const clearResponse = z.object({ message: z.string() });

registry.registerPath({
  method: "post",
  path: "/cache/clear",
  tags: ["Cache"],
  summary: "Clear all server-side caches",
  security,
  responses: {
    200: { description: "Cache cleared", content: { "application/json": { schema: clearResponse } } },
  },
});

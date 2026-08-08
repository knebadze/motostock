import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { registry } from "../../docs/registry.js";
import { ROLES } from "../../lib/roles.js";
import * as cacheController from "./cache.controller.js";

export const cacheRouter = Router();

cacheRouter.use(requireAuth, requireRole(ROLES.ADMIN));

cacheRouter.get("/", cacheController.list);
cacheRouter.post("/clear", cacheController.clear);

const security = [{ cookieAuth: [] }];
const clearResponse = z.object({ message: z.string() });
const cacheEntrySchema = z.object({ key: z.string(), valuePreview: z.string() });
const listResponse = z.object({ entries: z.array(cacheEntrySchema), count: z.int() });

registry.registerPath({
  method: "get",
  path: "/cache",
  tags: ["Cache"],
  summary: "List current server-side cache entries (key + a truncated value preview)",
  security,
  responses: {
    200: { description: "Cache entries", content: { "application/json": { schema: listResponse } } },
  },
});

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

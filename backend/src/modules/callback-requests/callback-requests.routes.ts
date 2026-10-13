import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { callbackRequestRateLimit } from "../../middleware/rateLimit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ApiError } from "../../lib/ApiError.js";
import { ROLES } from "../../lib/roles.js";
import {
  callbackRequestIdParamSchema,
  callbackRequestResponseSchema,
  createCallbackRequestSchema,
  listCallbackRequestsQuerySchema,
  resolveCallbackRequestSchema,
  type CreateCallbackRequestInput,
  type ListCallbackRequestsQuery,
  type ResolveCallbackRequestInput,
} from "./callback-requests.schema.js";
import {
  countOpenCallbackRequests,
  createCallbackRequest,
  listCallbackRequests,
  resolveCallbackRequest,
} from "./callback-requests.service.js";

export const callbackRequestsRouter = Router();

// Public (guests are the main audience). Its own tight limiter: anonymous
// and it emails staff.
callbackRequestsRouter.post(
  "/",
  callbackRequestRateLimit,
  validate(createCallbackRequestSchema),
  async (req: Request<unknown, unknown, CreateCallbackRequestInput>, res: Response) => {
    const result = await createCallbackRequest(req.body);
    res.status(201).json(result);
  },
);

// Staff inbox — per-route auth (the public POST above shares the prefix).
callbackRequestsRouter.get(
  "/",
  requireAuth,
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  validate(listCallbackRequestsQuerySchema, "query"),
  async (req: Request, res: Response) => {
    const requests = await listCallbackRequests(req.query as ListCallbackRequestsQuery);
    res.status(200).json({ requests });
  },
);
callbackRequestsRouter.get(
  "/open-count",
  requireAuth,
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  async (_req: Request, res: Response) => {
    res.status(200).json({ count: await countOpenCallbackRequests() });
  },
);
callbackRequestsRouter.patch(
  "/:id/resolve",
  requireAuth,
  requireRole(ROLES.ADMIN, ROLES.OPERATOR),
  validate(callbackRequestIdParamSchema, "params"),
  validate(resolveCallbackRequestSchema),
  async (req: Request<{ id: string }, unknown, ResolveCallbackRequestInput>, res: Response) => {
    if (!req.user) throw new ApiError(401, "Not authenticated", "NOT_AUTHENTICATED");
    const request = await resolveCallbackRequest(Number(req.params.id), req.user.sub, req.body.adminNote);
    res.status(200).json({ request });
  },
);

const security = [{ cookieAuth: [] }];

registry.registerPath({
  method: "post",
  path: "/callback-requests",
  tags: ["CallbackRequests"],
  summary: "Ask the shop to call back about a listing (public; notifies staff)",
  request: { body: { content: { "application/json": { schema: createCallbackRequestSchema } } } },
  responses: {
    201: { description: "Sent", content: { "application/json": { schema: z.object({ id: z.int() }) } } },
    404: { description: "Listing not found", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

registry.registerPath({
  method: "get",
  path: "/callback-requests",
  tags: ["CallbackRequests"],
  summary: "Callback requests inbox (admin/operator)",
  security,
  request: { query: listCallbackRequestsQuerySchema },
  responses: {
    200: {
      description: "Requests, newest first",
      content: { "application/json": { schema: z.object({ requests: z.array(callbackRequestResponseSchema) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/callback-requests/open-count",
  tags: ["CallbackRequests"],
  summary: "Open callback requests count (admin/operator)",
  security,
  responses: {
    200: { description: "Count", content: { "application/json": { schema: z.object({ count: z.int() }) } } },
  },
});

registry.registerPath({
  method: "patch",
  path: "/callback-requests/{id}/resolve",
  tags: ["CallbackRequests"],
  summary: "Mark a callback request handled (admin/operator)",
  security,
  request: {
    params: callbackRequestIdParamSchema,
    body: { content: { "application/json": { schema: resolveCallbackRequestSchema } } },
  },
  responses: {
    200: {
      description: "Resolved",
      content: { "application/json": { schema: z.object({ request: callbackRequestResponseSchema }) } },
    },
    409: { description: "Already resolved", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

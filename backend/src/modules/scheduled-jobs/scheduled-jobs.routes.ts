import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { registry } from "../../docs/registry.js";
import { errorResponseSchema } from "../../docs/schemas.js";
import { ROLES } from "../../lib/roles.js";
import * as scheduledJobsController from "./scheduled-jobs.controller.js";
import { scheduledJobKeyParamSchema, scheduledJobKeySchema, scheduledJobRunsQuerySchema } from "./scheduled-jobs.schema.js";

export const scheduledJobsRouter = Router();

scheduledJobsRouter.use(requireAuth, requireRole(ROLES.ADMIN));

scheduledJobsRouter.get("/", scheduledJobsController.list);
scheduledJobsRouter.get("/runs", validate(scheduledJobRunsQuerySchema, "query"), scheduledJobsController.listRuns);
scheduledJobsRouter.post(
  "/:key/run",
  validate(scheduledJobKeyParamSchema, "params"),
  scheduledJobsController.runNow,
);

const security = [{ cookieAuth: [] }];

const triggeredBySchema = z.object({ id: z.int(), name: z.string() }).nullable();
const scheduledJobRunSchema = z.object({
  id: z.int(),
  jobKey: scheduledJobKeySchema,
  trigger: z.enum(["SCHEDULED", "MANUAL"]),
  status: z.enum(["RUNNING", "SUCCESS", "FAILED"]),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  itemsAffected: z.int().nullable(),
  detail: z.record(z.string(), z.number()).nullable(),
  errorMessage: z.string().nullable(),
  triggeredBy: triggeredBySchema,
});
const scheduledJobDefinitionSchema = z.object({
  key: scheduledJobKeySchema,
  labelKa: z.string(),
  lastRun: scheduledJobRunSchema.nullable(),
});

registry.registerPath({
  method: "get",
  path: "/scheduled-jobs",
  tags: ["Scheduled jobs"],
  summary: "List every registered scheduled maintenance job with its most recent run",
  security,
  responses: {
    200: {
      description: "Job definitions",
      content: { "application/json": { schema: z.object({ jobs: z.array(scheduledJobDefinitionSchema) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/scheduled-jobs/runs",
  tags: ["Scheduled jobs"],
  summary: "Paginated run history, optionally filtered by jobKey",
  security,
  request: { query: scheduledJobRunsQuerySchema },
  responses: {
    200: {
      description: "Run history",
      content: {
        "application/json": {
          schema: z.object({
            runs: z.array(scheduledJobRunSchema),
            total: z.int(),
            page: z.int(),
            pageSize: z.int(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/scheduled-jobs/{key}/run",
  tags: ["Scheduled jobs"],
  summary: "Manually trigger one scheduled job right now (waits for it to finish)",
  security,
  request: { params: scheduledJobKeyParamSchema },
  responses: {
    200: {
      description: "Finished run",
      content: { "application/json": { schema: z.object({ run: scheduledJobRunSchema }) } },
    },
    404: { description: "Unknown job key", content: { "application/json": { schema: errorResponseSchema } } },
  },
});

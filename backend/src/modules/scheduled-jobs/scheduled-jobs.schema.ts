import { z } from "zod";

// Mirrors ScheduledJobKey in scheduled-job-run.prisma — one entry per prune
// function wired into scheduled-jobs.registry.ts.
export const scheduledJobKeySchema = z.enum([
  "DAILY_PRUNE_VISITOR_DATA",
  "DAILY_PRUNE_AUTH_ARTIFACTS",
  "DAILY_PRUNE_GUEST_PRODUCT_VIEWS",
  "DAILY_PRUNE_GUEST_VEHICLE_LISTING_VIEWS",
  "DAILY_PRUNE_RICH_TEXT_IMAGES",
]);
export type ScheduledJobKey = z.infer<typeof scheduledJobKeySchema>;

export const scheduledJobKeyParamSchema = z.object({ key: scheduledJobKeySchema });
export type ScheduledJobKeyParam = z.infer<typeof scheduledJobKeyParamSchema>;

// Same optional-page/pageSize shape as error-logs.schema.ts's
// errorLogsQuerySchema — both optional, defaults applied in the controller
// via resolvePage rather than zod's `.default()` (an output key zod infers
// as required-but-defaulted breaks Express's route handler overload
// resolution against the default ParsedQs query type).
export const scheduledJobRunsQuerySchema = z.object({
  jobKey: scheduledJobKeySchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
export type ScheduledJobRunsQuery = z.infer<typeof scheduledJobRunsQuerySchema>;

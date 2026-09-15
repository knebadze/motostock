import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import type { ScheduledJobTrigger } from "../../generated/prisma/index.js";
import { scheduledJobsRepository } from "./scheduled-jobs.repository.js";
import { JOB_DEFINITIONS } from "./scheduled-jobs.registry.js";
import type { ScheduledJobKey, ScheduledJobRunsQuery } from "./scheduled-jobs.schema.js";
import { resolvePage } from "../../lib/pagination.js";

const JOB_DEFINITION_BY_KEY = new Map(JOB_DEFINITIONS.map((job) => [job.key, job]));

// Same RUNNING-written-up-front-then-finished pattern as fina-sync.service.ts's
// runSync — a crash mid-job leaves a visibly stuck RUNNING row instead of no
// row at all. Called both by server.ts's cron schedule (trigger=SCHEDULED,
// triggeredById=null) and by the admin "run now" endpoint (trigger=MANUAL).
export async function runScheduledJob(
  key: ScheduledJobKey,
  trigger: ScheduledJobTrigger,
  triggeredById: number | null,
) {
  const definition = JOB_DEFINITION_BY_KEY.get(key);
  if (!definition) {
    throw new ApiError(404, "მითითებული ამოცანა ვერ მოიძებნა", "SCHEDULED_JOB_NOT_FOUND");
  }

  const run = await scheduledJobsRepository.createRunningRun({ jobKey: key, trigger, triggeredById });

  try {
    const { itemsAffected, detail } = await definition.run();
    return await scheduledJobsRepository.finishRun(run.id, {
      status: "SUCCESS",
      finishedAt: new Date(),
      itemsAffected,
      detail,
      errorMessage: null,
    });
  } catch (err) {
    logger.error({ err, jobKey: key }, "Scheduled job failed");
    const message = err instanceof Error ? err.message : "უცნობი შეცდომა";
    return await scheduledJobsRepository.finishRun(run.id, {
      status: "FAILED",
      finishedAt: new Date(),
      itemsAffected: null,
      detail: undefined,
      errorMessage: message,
    });
  }
}

export async function listJobDefinitions() {
  const keys = JOB_DEFINITIONS.map((job) => job.key);
  const latestByKey = await scheduledJobsRepository.findLatestRunPerJob(keys);
  return JOB_DEFINITIONS.map((job) => ({
    key: job.key,
    labelKa: job.labelKa,
    lastRun: latestByKey.get(job.key) ?? null,
  }));
}

export async function listJobRuns(filters: ScheduledJobRunsQuery) {
  const { page, pageSize, skip, take } = resolvePage(filters);
  const jobKey = filters.jobKey;

  const [runs, total] = await Promise.all([
    scheduledJobsRepository.listRuns({ jobKey }, skip, take),
    scheduledJobsRepository.count({ jobKey }),
  ]);

  return { runs, total, page, pageSize };
}

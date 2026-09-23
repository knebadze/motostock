import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import type { ScheduledJobTrigger } from "../../generated/prisma/index.js";
import { scheduledJobsRepository } from "./scheduled-jobs.repository.js";
import { DEFAULT_JOB_CRON, JOB_DEFINITIONS, formatCronScheduleLabel } from "./scheduled-jobs.registry.js";
import type { ScheduledJobKey, ScheduledJobRunsQuery } from "./scheduled-jobs.schema.js";
import { resolvePage } from "../../lib/pagination.js";

const JOB_DEFINITION_BY_KEY = new Map(JOB_DEFINITIONS.map((job) => [job.key, job]));

// Arbitrary namespace, unique to this lock's purpose (see fina-sync.service.ts's
// FINA_SYNC_LOCK_KEY comment for why a plain int works). Paired with
// hashtext(jobKey) as the second int, so the lock is per-job — unrelated jobs
// never contend with each other, only two attempts to run the SAME job.
const SCHEDULED_JOB_LOCK_NAMESPACE = 851972455;

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

  // Guards against two overlapping executions of the SAME job — the daily
  // cron tick racing the immediate boot-time run (server.ts fires every job
  // once at startup too), or an admin's manual "run now" racing either of
  // those during a redeploy. node-cron's own noOverlap only protects two
  // ticks of its own schedule, not these other triggers, so without this a
  // job like BIRTHDAY_EMAIL could genuinely send duplicate emails (see
  // birthday-email.service.ts's alreadyRanToday, which only catches a prior
  // SUCCESS, never a same-moment RUNNING race). The advisory lock makes the
  // "is one already running" check and creating this run's own RUNNING row
  // atomic, so two racing calls can't both see "none running" and proceed —
  // it's released the moment this short transaction commits, well before the
  // job's own (possibly slow, possibly network-bound) work below starts, so
  // it never extends how long a pooled connection is held.
  const run = await prisma.$transaction(async (tx) => {
    const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(${SCHEDULED_JOB_LOCK_NAMESPACE}, hashtext(${key})) AS locked
    `;
    if (!locked) {
      return null;
    }
    const alreadyRunning = await scheduledJobsRepository.findRunningRun(key, tx);
    if (alreadyRunning) {
      return null;
    }
    return scheduledJobsRepository.createRunningRun({ jobKey: key, trigger, triggeredById }, tx);
  });

  if (!run) {
    throw new ApiError(409, "ეს ამოცანა უკვე მიმდინარეობს", "SCHEDULED_JOB_ALREADY_RUNNING");
  }

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
    scheduleLabelKa: formatCronScheduleLabel(job.cron ?? DEFAULT_JOB_CRON),
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

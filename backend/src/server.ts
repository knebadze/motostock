import cron, { type ScheduledTask } from "node-cron";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./lib/logger.js";
import { isFinaConfigured, runSync } from "./modules/fina-sync/fina-sync.service.js";
import { getFinaSyncIntervalMinutes } from "./modules/settings/settings.service.js";
import { JOB_DEFINITIONS } from "./modules/scheduled-jobs/scheduled-jobs.registry.js";
import { runScheduledJob } from "./modules/scheduled-jobs/scheduled-jobs.service.js";

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);
});

// Self-rescheduling (setTimeout, not setInterval) so an admin changing the
// interval in Settings takes effect from the *next* run onward, without
// needing a server restart — a fixed setInterval would freeze whatever
// value was live at boot.
let finaSyncTimer: NodeJS.Timeout | undefined;
let finaSyncStopped = false;
if (isFinaConfigured()) {
  const scheduleNext = () => {
    if (finaSyncStopped) return;
    getFinaSyncIntervalMinutes()
      .then((minutes) => {
        if (finaSyncStopped) return;
        finaSyncTimer = setTimeout(() => {
          runSync("SCHEDULED")
            .catch((err: unknown) => logger.error({ err }, "Scheduled FINA sync failed"))
            .finally(scheduleNext);
        }, minutes * 60_000);
      })
      .catch((err: unknown) => logger.error({ err }, "Failed to read FINA sync interval setting"));
  };
  scheduleNext();
  logger.info("FINA scheduled sync enabled (interval configurable in Settings)");
}

// Bounds the growth of every table with no other retention policy
// (VisitorPresence/VisitorVisit, Session/PasswordResetToken/
// EmailVerificationToken, guest-owned ProductView/VehicleListingView rows,
// orphaned rich-text images — see scheduled-jobs.registry.ts for the actual
// prune functions) — daily is plenty, none of them need pruning more
// precisely than that. Real wall-clock cron (03:00 Tbilisi time) instead of
// a plain `setInterval`, which only ever counted 24h from whenever this
// process happened to boot — during frequent redeploys that interval
// effectively never fired, and even when it did it could land at any hour.
// Each run is persisted via scheduled-jobs' RUNNING->SUCCESS/FAILED history
// (see the admin "ავტომატური დავალებები" page) instead of only logging on
// failure. `noOverlap` skips a cron tick if the previous run of the *same*
// job is still in flight — no separate lock needed, this is a single-
// instance deployment (see docker-compose.yml) and every job here is a pure
// cutoff-based delete with no correctness risk from a stray concurrent run,
// unlike FINA sync's stock mutations above. `unref` matches the old
// `dailyPruneTimer.unref()` — these tasks must never keep the process alive
// on their own.
// Not just prune jobs anymore (FETCH_USD_GEL_RATE also rides this array/
// schedule, purely for infra reuse — see scheduled-jobs.registry.ts).
const DAILY_SCHEDULED_JOB_CRON = "0 3 * * *";
function runDailyScheduledJob(key: (typeof JOB_DEFINITIONS)[number]["key"]) {
  runScheduledJob(key, "SCHEDULED", null).catch((err: unknown) =>
    logger.error({ err, jobKey: key }, "Scheduled job failed"),
  );
}
// Also run once immediately on boot, not just on the cron schedule — this
// app still deploys far more often than once a day, so relying on the cron
// trigger alone would often mean these jobs never actually fire in
// practice (same rationale the old setInterval version's boot-time call
// had; node-cron's TaskOptions has no "run immediately" flag of its own).
JOB_DEFINITIONS.forEach((job) => runDailyScheduledJob(job.key));
const dailyScheduledJobCronTasks: ScheduledTask[] = JOB_DEFINITIONS.map((job) =>
  cron.schedule(DAILY_SCHEDULED_JOB_CRON, () => runDailyScheduledJob(job.key), {
    timezone: "Asia/Tbilisi",
    noOverlap: true,
    unref: true,
  }),
);

// Docker Compose sends SIGTERM (then SIGKILL after its ~10s grace period) on
// every `stop`/`restart`/recreate — i.e. on every deploy, not just a rare
// crash. Without this, Node's default SIGTERM behavior is to exit
// immediately: any in-flight request (e.g. a customer mid-checkout) has its
// connection cut, and the DB pool is torn down rather than drained. The
// force-exit fallback below is set under Compose's default grace period so
// this always finishes cleanly on its own rather than getting SIGKILLed.
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully`);

  finaSyncStopped = true;
  if (finaSyncTimer) clearTimeout(finaSyncTimer);
  dailyScheduledJobCronTasks.forEach((task) => task.stop());

  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 8_000);
  forceExit.unref();

  // Stops accepting new connections; existing in-flight requests finish
  // naturally and this callback only fires once they've all completed.
  server.close(async (err) => {
    if (err) logger.error({ err }, "Error while closing HTTP server");
    try {
      await prisma.$disconnect();
    } catch (disconnectErr) {
      logger.error({ err: disconnectErr }, "Error while disconnecting Prisma");
    }
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Without these, an unhandled rejection anywhere (a fire-and-forget
// `.catch()` missing on some future code path — every existing one in this
// codebase already has one, see the daily-prune calls above) or a genuinely
// uncaught synchronous throw crashed the whole process with nothing beyond
// Node's raw default stderr dump — no structured log entry, and none of the
// graceful-drain care the SIGTERM/SIGINT path above already gets. Node's
// own guidance is that it's not safe to resume normal operation after
// `uncaughtException` (the process may be in a genuinely broken state), so
// this reuses the SAME `shutdown()` path rather than trying to keep serving
// requests — bounded by its existing 8s forceExit fallback either way, so
// this can never hang the process open indefinitely.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
  shutdown("unhandledRejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  shutdown("uncaughtException");
});

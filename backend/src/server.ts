import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./lib/logger.js";
import { isFinaConfigured, runSync } from "./modules/fina-sync/fina-sync.service.js";
import { getFinaSyncIntervalMinutes } from "./modules/settings/settings.service.js";

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

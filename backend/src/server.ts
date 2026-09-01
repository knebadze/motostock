import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./lib/logger.js";
import { isFinaConfigured, runSync } from "./modules/fina-sync/fina-sync.service.js";

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);
});

let finaSyncInterval: NodeJS.Timeout | undefined;
if (isFinaConfigured()) {
  finaSyncInterval = setInterval(
    () => {
      runSync("SCHEDULED").catch((err: unknown) => logger.error({ err }, "Scheduled FINA sync failed"));
    },
    env.FINA_SYNC_INTERVAL_MINUTES * 60_000,
  );
  logger.info(`FINA scheduled sync enabled (every ${env.FINA_SYNC_INTERVAL_MINUTES}m)`);
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

  if (finaSyncInterval) clearInterval(finaSyncInterval);

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

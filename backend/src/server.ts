import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { isFinaConfigured, runSync } from "./modules/fina-sync/fina-sync.service.js";

app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);

  if (isFinaConfigured()) {
    setInterval(
      () => {
        runSync("SCHEDULED").catch((err: unknown) => logger.error({ err }, "Scheduled FINA sync failed"));
      },
      env.FINA_SYNC_INTERVAL_MINUTES * 60_000,
    );
    logger.info(`FINA scheduled sync enabled (every ${env.FINA_SYNC_INTERVAL_MINUTES}m)`);
  }
});

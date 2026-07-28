import { env } from "../../config/env.js";
import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import { FinaApiError, getProductsRestByStore, isFinaConfigured } from "./fina-client.js";
import { finaSyncRepository } from "./fina-sync.repository.js";
import type { FinaSyncTrigger } from "../../generated/prisma/index.js";

let isRunning = false;

export { isFinaConfigured };

export async function runSync(trigger: FinaSyncTrigger, triggeredById: number | null = null) {
  if (isRunning) {
    throw new ApiError(409, "სინქრონიზაცია უკვე მიმდინარეობს");
  }

  if (!isFinaConfigured()) {
    const message = "FINA სინქრონიზაცია არ არის კონფიგურირებული";
    await finaSyncRepository.createRun({
      trigger,
      status: "FAILED",
      finishedAt: new Date(),
      variantsChecked: 0,
      variantsUpdated: 0,
      errorMessage: message,
      triggeredById,
    });
    throw new ApiError(400, message);
  }

  isRunning = true;
  try {
    const variants = await finaSyncRepository.findLinkedVariants();
    const variantsChecked = variants.length;
    let variantsUpdated = 0;

    try {
      const rests = await getProductsRestByStore(env.FINA_STORE!);
      const restByFinaId = new Map(rests.map((r) => [r.id, r.rest]));

      for (const variant of variants) {
        const rest = restByFinaId.get(variant.finaId!);
        if (rest === undefined) continue;
        await finaSyncRepository.updateStock(variant.id, Math.max(0, Math.floor(rest)));
        variantsUpdated += 1;
      }

      const status = variantsChecked === 0 || variantsUpdated === variantsChecked ? "SUCCESS" : "PARTIAL";
      return await finaSyncRepository.createRun({
        trigger,
        status,
        finishedAt: new Date(),
        variantsChecked,
        variantsUpdated,
        errorMessage: null,
        triggeredById,
      });
    } catch (err) {
      const message = err instanceof FinaApiError ? err.message : "მოულოდნელი შეცდომა FINA სინქრონიზაციისას";
      logger.error({ err }, "FINA sync failed");
      return await finaSyncRepository.createRun({
        trigger,
        status: "FAILED",
        finishedAt: new Date(),
        variantsChecked,
        variantsUpdated,
        errorMessage: message,
        triggeredById,
      });
    }
  } finally {
    isRunning = false;
  }
}

export function listSyncRuns(limit = 50) {
  return finaSyncRepository.listRuns(limit);
}

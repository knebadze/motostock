import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import { FinaApiError, getProductsRestArray, getProductsRestByStore, isFinaConfigured } from "./fina-client.js";
import { finaSyncRepository } from "./fina-sync.repository.js";
import type { FinaSyncTrigger } from "../../generated/prisma/index.js";

export { isFinaConfigured };

// Arbitrary fixed key, unique to this lock's purpose (any int works —
// Postgres advisory locks don't need to reference a real row).
const FINA_SYNC_LOCK_KEY = 851972364;

export async function runSync(trigger: FinaSyncTrigger, triggeredById: number | null = null) {
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

  // A Postgres transaction-scoped advisory lock (not the old in-memory
  // `isRunning` boolean) so two concurrent runs can't overlap even if the
  // backend is ever scaled to more than one process/container — the lock
  // is held by Postgres, not by this process's memory, and releases
  // automatically when the transaction below commits or throws, regardless
  // of which pooled connection Prisma happens to use for it. The FINA API
  // call and per-variant writes run inside the same callback (and so under
  // the lock) even though most of them go through finaSyncRepository's own
  // connection, since only one process can hold this lock key at a time.
  return prisma.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${FINA_SYNC_LOCK_KEY}) AS locked
      `;
      if (!locked) {
        throw new ApiError(409, "სინქრონიზაცია უკვე მიმდინარეობს");
      }

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
    },
    // Generous timeout — a full-catalog sync makes an external FINA API
    // call plus one DB write per linked variant, which can run well past
    // Prisma's 5s interactive-transaction default.
    { timeout: 5 * 60 * 1000, maxWait: 10_000 },
  );
}

export function listSyncRuns(limit = 50) {
  return finaSyncRepository.listRuns(limit);
}

// Live per-item stock refresh for checkout (cart→checkout entry and right
// before order placement — see orders.service.ts's computeCheckoutTotals),
// distinct from runSync's full-catalog admin job above: scoped to just the
// cart's variant ids, and NOT logged as a FinaSyncRun (that history table
// is for the scheduled/manual admin job, not every shopper's checkout
// visit). Never throws on missing config or a failed FINA call — the caller
// falls back to whatever stockQuantity is already in the DB rather than
// failing checkout outright over an external API hiccup. The boolean return
// (added for placeOrder's CONFIRMED-vs-PENDING decision — see
// orders.service.ts) reports whether FINA was actually reached and
// confirmed *something*, not just "no error was thrown".
const RECENT_SYNC_TTL_MS = 20_000;
const recentSyncAt = new Map<string, number>();
const recentSyncConfirmed = new Map<string, boolean>();

function syncThrottleKey(variantIds: number[]): string {
  return [...variantIds].sort((a, b) => a - b).join(",");
}

export async function syncVariantStockByIds(variantIds: number[]): Promise<boolean> {
  if (variantIds.length === 0 || !isFinaConfigured()) return false;

  const key = syncThrottleKey(variantIds);
  const now = Date.now();
  const last = recentSyncAt.get(key);
  // Within the throttle window, reuse the *previous* call's outcome instead
  // of re-hitting FINA — still an accurate "did FINA confirm these items
  // recently" answer, just not a fresh round-trip.
  if (last != null && now - last < RECENT_SYNC_TTL_MS) {
    return recentSyncConfirmed.get(key) ?? false;
  }
  recentSyncAt.set(key, now);

  try {
    const variants = await finaSyncRepository.findLinkedVariantsByIds(variantIds);
    if (variants.length === 0) {
      // None of these variants are FINA-linked at all — nothing for FINA to
      // confirm, so this isn't a "confirmation" either way.
      recentSyncConfirmed.set(key, false);
      return false;
    }

    const rests = await getProductsRestByStore(env.FINA_STORE!);
    const restByFinaId = new Map(rests.map((r) => [r.id, r.rest]));

    for (const variant of variants) {
      const rest = restByFinaId.get(variant.finaId!);
      if (rest === undefined) continue;
      await finaSyncRepository.updateStock(variant.id, Math.max(0, Math.floor(rest)));
    }

    recentSyncConfirmed.set(key, true);
    return true;
  } catch (err) {
    logger.error({ err }, "FINA checkout stock refresh failed");
    recentSyncConfirmed.set(key, false);
    return false;
  }
}

export type OrderStockSyncResult = {
  checked: number;
  updated: number;
  items: { productVariantId: number; previousStock: number; newStock: number | null }[];
};

// Admin order-detail action (see fina-sync.controller.ts's syncOrder) — an
// explicit, on-demand re-check of FINA stock for just the FINA-linked
// product variants on one order, using getProductsRestArray's id-scoped
// lookup instead of runSync's whole-catalog pull. Unlike
// syncVariantStockByIds above, this is a deliberate admin click with its own
// error toast, so a FINA failure surfaces as a thrown ApiError rather than
// degrading silently.
export async function syncOrderStock(orderId: number): Promise<OrderStockSyncResult> {
  if (!isFinaConfigured()) {
    throw new ApiError(400, "FINA სინქრონიზაცია არ არის კონფიგურირებული");
  }

  const variants = await finaSyncRepository.findLinkedVariantsForOrder(orderId);
  if (variants.length === 0) {
    return { checked: 0, updated: 0, items: [] };
  }

  try {
    const rests = await getProductsRestArray(variants.map((variant) => variant.finaId!));
    const restByFinaId = new Map(rests.map((r) => [r.id, r.rest]));

    const items: OrderStockSyncResult["items"] = [];
    let updated = 0;
    for (const variant of variants) {
      const rest = restByFinaId.get(variant.finaId!);
      if (rest === undefined) {
        items.push({ productVariantId: variant.id, previousStock: variant.stockQuantity, newStock: null });
        continue;
      }
      const newStock = Math.max(0, Math.floor(rest));
      await finaSyncRepository.updateStock(variant.id, newStock);
      updated += 1;
      items.push({ productVariantId: variant.id, previousStock: variant.stockQuantity, newStock });
    }

    return { checked: variants.length, updated, items };
  } catch (err) {
    const message = err instanceof FinaApiError ? err.message : "მოულოდნელი შეცდომა FINA სინქრონიზაციისას";
    logger.error({ err }, "FINA order stock sync failed");
    throw new ApiError(502, message);
  }
}

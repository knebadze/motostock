import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";
import { logger } from "../../lib/logger.js";
import {
  FinaApiError,
  getProductsRestArray,
  getProductsRestByStore,
  isFinaConfigured,
  saveDocCustomerReturn,
  saveDocProductOut,
  type FinaSaleLine,
} from "./fina-client.js";
import { finaSyncRepository } from "./fina-sync.repository.js";
import { getFinaWebCustomerId, getFinaWebUserId } from "../settings/settings.service.js";
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

  const variants = await finaSyncRepository.findLinkedVariants();
  const variantsChecked = variants.length;

  // Fetched before the transaction/lock below, not inside it — an external
  // network call (even timeout-bounded, see fina-client.ts's
  // FINA_REQUEST_TIMEOUT_MS) has no reason to extend how long the advisory
  // lock, and the one pool connection backing it, stay held once the actual
  // DB work starts. A failure here never touches the lock at all — there's
  // nothing to protect yet, so it's logged and returned directly.
  let rests: Awaited<ReturnType<typeof getProductsRestByStore>>;
  try {
    rests = await getProductsRestByStore(env.FINA_STORE!);
  } catch (err) {
    const message = err instanceof FinaApiError ? err.message : "მოულოდნელი შეცდომა FINA სინქრონიზაციისას";
    logger.error({ err }, "FINA sync failed");
    return finaSyncRepository.createRun({
      trigger,
      status: "FAILED",
      finishedAt: new Date(),
      variantsChecked,
      variantsUpdated: 0,
      errorMessage: message,
      triggeredById,
    });
  }

  const restByFinaId = new Map(rests.map((r) => [r.id, r.rest]));
  const updates = variants
    .filter((variant) => restByFinaId.has(variant.finaId!))
    .map((variant) => ({
      id: variant.id,
      stockQuantity: Math.max(0, Math.floor(restByFinaId.get(variant.finaId!)!)),
    }));

  // A Postgres transaction-scoped advisory lock (not the old in-memory
  // `isRunning` boolean) so two concurrent runs can't overlap even if the
  // backend is ever scaled to more than one process/container — the lock
  // is held by Postgres, not by this process's memory, and releases
  // automatically when the transaction below commits or throws, regardless
  // of which pooled connection Prisma happens to use for it. The actual
  // stock write (updateStockBatch) runs inside this callback but, like the
  // old per-variant loop it replaced, goes through finaSyncRepository's own
  // connection rather than `tx` — the lock is what matters for serializing
  // concurrent runs, not which connection the write itself commits on.
  return prisma.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${FINA_SYNC_LOCK_KEY}) AS locked
      `;
      if (!locked) {
        throw new ApiError(409, "სინქრონიზაცია უკვე მიმდინარეობს");
      }

      try {
        // One round trip for every linked variant instead of one UPDATE per
        // variant — see finaSyncRepository.updateStockBatch.
        await finaSyncRepository.updateStockBatch(updates);
        const variantsUpdated = updates.length;

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
          variantsUpdated: 0,
          errorMessage: message,
          triggeredById,
        });
      }
    },
    // Still generous, though the transaction itself now only needs to cover
    // the lock check + one batch UPDATE + one log write, not N sequential
    // per-variant round trips — kept wide as a safety margin, not because
    // this path is expected to need it.
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

    // Recorded in the same sync history the scheduled/manual admin jobs use
    // (see runSync above) so a run of checkout-time failures — FINA down,
    // slow, misconfigured — is visible somewhere other than the server log,
    // without logging every *successful* shopper visit (the throttle window
    // above already caps how often this fires for the same cart contents).
    await finaSyncRepository
      .createRun({
        trigger: "CHECKOUT",
        status: "FAILED",
        finishedAt: new Date(),
        variantsChecked: 0,
        variantsUpdated: 0,
        errorMessage:
          err instanceof FinaApiError ? err.message : "მოულოდნელი შეცდომა FINA-სთან დაკავშირებისას",
        triggeredById: null,
      })
      .catch((logErr) => logger.error({ err: logErr }, "Failed to record FINA checkout sync-run"));

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

// Web orders are always non-cash from FINA's point of view (bank/card, not
// someone handing over cash at the register) — confirmed with the user
// rather than inferred from fulfillmentMethod.
const FINA_PAY_TYPE_NON_CASH = 1;

export type FinaOrderPushItem = {
  productVariantId: number | null;
  quantity: number;
  unitPrice: number;
};

// Shared by pushOrderSale/pushOrderReturn below — resolves each order line
// to a FINA product id via ProductVariant.finaId, dropping vehicle-listing
// lines (no FINA field exists on that model) and any variant that isn't
// FINA-linked. Returns null if there's nothing FINA-relevant to push, so the
// caller can bail out without an empty saveDoc* call.
async function buildFinaOrderLines(
  orderId: number,
  items: FinaOrderPushItem[],
): Promise<FinaSaleLine[] | null> {
  const linked = await finaSyncRepository.findLinkedVariantsForOrder(orderId);
  if (linked.length === 0) return null;

  const finaIdByVariantId = new Map(linked.map((variant) => [variant.id, variant.finaId!]));
  const lines = items
    .filter((item) => item.productVariantId != null && finaIdByVariantId.has(item.productVariantId))
    .map((item) => ({
      id: finaIdByVariantId.get(item.productVariantId!)!,
      quantity: item.quantity,
      price: item.unitPrice,
    }));

  return lines.length > 0 ? lines : null;
}

function sumLineAmount(lines: FinaSaleLine[]): number {
  return Math.round(lines.reduce((sum, line) => sum + line.quantity * line.price, 0) * 100) / 100;
}

// Thrown by attemptOrderSalePush/attemptOrderReturnPush when there is
// nothing FINA-relevant to do (not configured, Settings not filled in, no
// FINA-linked items, or — for a return — no prior sale to return against).
// Distinct from a real FINA API failure: pushOrderSale/pushOrderReturn treat
// this as a silent no-op (order stays NOT_APPLICABLE), while
// retryOrderFinaPush surfaces it to the admin as a 400 explaining why a
// manual retry isn't possible, rather than a 502 implying FINA itself is
// unreachable.
class FinaPushSkipped extends Error {}

type FinaOrderPushInput = {
  id: number;
  orderCode: string;
  items: FinaOrderPushItem[];
};

// Resolves config/Settings and builds the order's FINA line items, or throws
// FinaPushSkipped explaining why there's nothing to push. Shared by both the
// sale and return attempt functions below.
async function resolveFinaPushContext(
  order: FinaOrderPushInput,
): Promise<{ customerId: number; userId: number; lines: FinaSaleLine[] }> {
  if (!isFinaConfigured()) {
    throw new FinaPushSkipped("FINA არ არის კონფიგურირებული");
  }
  const [customerId, userId] = await Promise.all([getFinaWebCustomerId(), getFinaWebUserId()]);
  if (customerId == null || userId == null) {
    throw new FinaPushSkipped("FINA-ს პარამეტრებში მყიდველისა და მომხმარებლის ID არ არის შევსებული");
  }
  const lines = await buildFinaOrderLines(order.id, order.items);
  if (!lines) {
    throw new FinaPushSkipped("ამ შეკვეთას არცერთი FINA-სთან დაკავშირებული ერთეული არ აქვს");
  }
  return { customerId, userId, lines };
}

// Records this order's sale in FINA (saveDocProductOut) and stores the
// returned operation id + SYNCED status on the order. Throws FinaPushSkipped
// when there's nothing to push, or the underlying FinaApiError/network error
// if the call itself fails — callers decide how to handle each.
async function attemptOrderSalePush(order: FinaOrderPushInput): Promise<number> {
  const { customerId, userId, lines } = await resolveFinaPushContext(order);

  const finaOutOperationId = await saveDocProductOut({
    date: new Date().toISOString(),
    purpose: `ვების შეკვეთა № ${order.orderCode}`,
    amount: sumLineAmount(lines),
    store: Number(env.FINA_STORE),
    customer: customerId,
    user: userId,
    payType: FINA_PAY_TYPE_NON_CASH,
    products: lines,
  });
  await finaSyncRepository.setOrderFinaSyncStatus(order.id, "SYNCED", finaOutOperationId);
  return finaOutOperationId;
}

// Mirrors an order's local stock-restore-on-cancel (see orders.service.ts's
// updateOrderStatus RESTORE branch) into FINA via saveDocCustomerReturn,
// referencing the stored finaOutOperationId as out_id. Throws
// FinaPushSkipped when finaOutOperationId is null — the original sale was
// never recorded in FINA, so there is nothing for a "return" to reference;
// pushing one anyway would inject a phantom stock increase into FINA's real
// accounting.
async function attemptOrderReturnPush(
  order: FinaOrderPushInput & { finaOutOperationId: number | null },
): Promise<void> {
  if (order.finaOutOperationId == null) {
    throw new FinaPushSkipped("ამ შეკვეთის თავდაპირველი გაყიდვა FINA-ში არასდროს დასინქრონდა");
  }
  const { customerId, userId, lines } = await resolveFinaPushContext(order);

  await saveDocCustomerReturn({
    date: new Date().toISOString(),
    purpose: `შეკვეთის გაუქმება № ${order.orderCode}`,
    amount: sumLineAmount(lines),
    store: Number(env.FINA_STORE),
    customer: customerId,
    user: userId,
    payType: FINA_PAY_TYPE_NON_CASH,
    products: lines.map((line) => ({ ...line, outId: order.finaOutOperationId! })),
  });
  await finaSyncRepository.setOrderFinaSyncStatus(order.id, "SYNCED");
}

// Fires right after placeOrder commits (see orders.service.ts). Best-effort
// and never throws — same catch/log/no-op contract as syncVariantStockByIds,
// so a FINA outage or an admin who hasn't filled in the FINA web-customer/
// user Settings yet never blocks a real checkout. A genuine FINA API failure
// (order has FINA-linked items, config is present, but the call itself
// errored) is recorded as FAILED so the admin order list can flag it and
// offer the manual retry below.
export async function pushOrderSale(order: FinaOrderPushInput): Promise<void> {
  try {
    await attemptOrderSalePush(order);
  } catch (err) {
    if (err instanceof FinaPushSkipped) return;
    logger.error({ err, orderId: order.id }, "FINA sale push failed");
    await finaSyncRepository.setOrderFinaSyncStatus(order.id, "FAILED");
  }
}

// Fires from updateOrderStatus's RESTORE branch (see orders.service.ts).
// Same best-effort catch/log/no-op contract as pushOrderSale.
export async function pushOrderReturn(
  order: FinaOrderPushInput & { finaOutOperationId: number | null },
): Promise<void> {
  try {
    await attemptOrderReturnPush(order);
  } catch (err) {
    if (err instanceof FinaPushSkipped) return;
    logger.error({ err, orderId: order.id }, "FINA return push failed");
    await finaSyncRepository.setOrderFinaSyncStatus(order.id, "FAILED");
  }
}

// Admin-triggered manual retry (see orders.service.ts's retryOrderFinaSync,
// wired to the order-detail "გაუშვი ხელით" button) — unlike the two
// best-effort pushes above, this is a deliberate admin click with its own
// error toast, so it surfaces failures as a thrown ApiError instead of
// degrading silently (same convention as syncOrderStock). Picks sale vs.
// return by the order's current cancellation state: a cancelled order always
// means "retry the return", everything else means "retry the sale" — this
// mirrors exactly the automatic paths' own direction logic, so a manual
// retry can never push the wrong document type for the order's current
// state.
export async function retryOrderFinaPush(order: {
  id: number;
  orderCode: string;
  isCancelled: boolean;
  finaOutOperationId: number | null;
  items: FinaOrderPushItem[];
}): Promise<void> {
  try {
    if (order.isCancelled) {
      await attemptOrderReturnPush(order);
    } else {
      await attemptOrderSalePush(order);
    }
  } catch (err) {
    if (err instanceof FinaPushSkipped) {
      throw new ApiError(400, err.message);
    }
    await finaSyncRepository.setOrderFinaSyncStatus(order.id, "FAILED");
    const message = err instanceof FinaApiError ? err.message : "მოულოდნელი შეცდომა FINA-სთან კავშირისას";
    throw new ApiError(502, message);
  }
}

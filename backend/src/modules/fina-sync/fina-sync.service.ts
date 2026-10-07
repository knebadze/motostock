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
  type FinaProductRest,
  type FinaSaleLine,
} from "./fina-client.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { finaSyncRepository } from "./fina-sync.repository.js";
import { getFinaWebCustomerId, getFinaWebUserId } from "../settings/settings.service.js";
import type { FinaOrderSyncStatus, FinaSyncTrigger } from "../../generated/prisma/index.js";

export { isFinaConfigured };

// Arbitrary fixed key, unique to this lock's purpose (any int works —
// Postgres advisory locks don't need to reference a real row).
const FINA_SYNC_LOCK_KEY = 851972364;

// Order-push outbox (see order.prisma's FinaOrderSyncStatus.PENDING).
// Lease comfortably longer than one FINA call (fina-client.ts's 8s
// FINA_REQUEST_TIMEOUT_MS), so it never expires under a push still running.
const FINA_ORDER_PUSH_LEASE_MS = 60_000;
// Automatic attempts (the immediate one + sweeps) before an order is marked
// FAILED and left for the admin's manual retry.
export const FINA_ORDER_PUSH_MAX_ATTEMPTS = 5;
// Per sweep — far above any realistic backlog for one shop; just a bound.
const FINA_ORDER_PUSH_SWEEP_BATCH = 50;

// What the site may sell of one FINA product: the physical rest minus what
// FINA itself holds reserved (goods set aside at the register count as
// gone). Floored — FINA quantities can be fractional (weighed/measured
// goods); the site only sells whole units.
function sellableQuantity(row: FinaProductRest): number {
  return Math.max(0, Math.floor(row.rest - (row.reserve ?? 0)));
}

// Sellable quantity per FINA product id for this shop's store (FINA_STORE).
// With `finaIds`, only those products are requested (getProductsRestArray —
// a cart's few items, not the whole catalog); that endpoint can return rows
// for every store, so they're filtered to FINA_STORE. If none match (the
// `store` field turns out to be formatted differently from FINA_STORE, e.g.
// a name vs. a code) it falls back to the store-scoped endpoint rather than
// mixing in another store's stock.
async function fetchStoreAvailability(finaIds?: number[]): Promise<Map<number, number>> {
  const store = env.FINA_STORE!.trim();
  let rows: FinaProductRest[];
  if (finaIds && finaIds.length > 0) {
    const allStores = await getProductsRestArray(finaIds);
    rows = allStores.filter((row) => String(row.store).trim() === store);
    if (allStores.length > 0 && rows.length === 0) {
      logger.warn(
        { store, returnedStore: allStores[0].store },
        "FINA getProductsRestArray returned no rows for FINA_STORE — falling back to getProductsRestByStore",
      );
      rows = await getProductsRestByStore(store);
    }
  } else {
    rows = await getProductsRestByStore(store);
  }

  const availability = new Map<number, number>();
  for (const row of rows) {
    availability.set(row.id, (availability.get(row.id) ?? 0) + sellableQuantity(row));
  }
  return availability;
}

// SOLD/AVAILABLE listing-status ids for applyFinaAvailability's status flip
// — null (flip skipped, stock still written) if the lookup rows are missing.
async function resolveListingStatusIds(): Promise<{ sold: number; available: number } | null> {
  const delegate = getLookupDelegate("listing-statuses");
  const [sold, available] = await Promise.all([
    lookupsRepository.findByKey(delegate, "SOLD"),
    lookupsRepository.findByKey(delegate, "AVAILABLE"),
  ]);
  return sold && available ? { sold: sold.id, available: available.id } : null;
}

// Writes FINA's availability into the given variants (only those FINA
// reported) via finaSyncRepository.applyFinaAvailability — which accounts
// for web orders FINA hasn't recorded yet. `snapshotTakenAt` must be taken
// before the FINA request that produced `availability`.
async function applyAvailability(
  variants: { id: number; finaId: number | null }[],
  availability: Map<number, number>,
  snapshotTakenAt: Date,
) {
  const entries = variants
    .filter((variant) => variant.finaId != null && availability.has(variant.finaId))
    .map((variant) => ({ variantId: variant.id, available: availability.get(variant.finaId!)! }));
  return finaSyncRepository.applyFinaAvailability(entries, snapshotTakenAt, await resolveListingStatusIds());
}

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

  // Written up front, before the external FINA call below (which is itself
  // fetched before the transaction/lock further down — see that comment) —
  // a crash or unhandled failure anywhere from here on (network hang,
  // process kill, etc.) now leaves this row visibly stuck at RUNNING
  // (finishedAt stays null) instead of no row existing at all, so the
  // admin's sync history shows *where* a run went missing instead of a
  // silent gap.
  const run = await finaSyncRepository.createRunningRun({ trigger, variantsChecked, triggeredById });

  // Fetched before the transaction/lock below, not inside it — an external
  // network call (even timeout-bounded, see fina-client.ts's
  // FINA_REQUEST_TIMEOUT_MS) has no reason to extend how long the advisory
  // lock, and the one pool connection backing it, stay held once the actual
  // DB work starts. A failure here never touches the lock at all — there's
  // nothing to protect yet, so it's logged and returned directly.
  const snapshotTakenAt = new Date();
  let availability: Map<number, number>;
  try {
    availability = await fetchStoreAvailability();
  } catch (err) {
    const message = err instanceof FinaApiError ? err.message : "მოულოდნელი შეცდომა FINA სინქრონიზაციისას";
    logger.error({ err }, "FINA sync failed");
    return finaSyncRepository.finishRun(run.id, {
      status: "FAILED",
      finishedAt: new Date(),
      variantsChecked,
      variantsUpdated: 0,
      errorMessage: message,
    });
  }

  // A Postgres transaction-scoped advisory lock (not an in-memory flag) so
  // two concurrent runs can't overlap even if the backend is ever scaled to
  // more than one process/container. The stock write itself
  // (applyAvailability) runs in its own short transaction — the lock is what
  // serializes concurrent runs, not which connection the write commits on.
  return prisma.$transaction(
    async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${FINA_SYNC_LOCK_KEY}) AS locked
      `;
      if (!locked) {
        const message = "სინქრონიზაცია უკვე მიმდინარეობს";
        // Resolves this run's own RUNNING row instead of leaving it stuck —
        // this attempt never got to do anything (another run holds the
        // lock), so it's recorded as FAILED with that explanation rather
        // than silently orphaned.
        await finaSyncRepository.finishRun(run.id, {
          status: "FAILED",
          finishedAt: new Date(),
          variantsChecked,
          variantsUpdated: 0,
          errorMessage: message,
        });
        throw new ApiError(409, message);
      }

      try {
        const results = await applyAvailability(variants, availability, snapshotTakenAt);
        const variantsUpdated = results.length;

        const status = variantsChecked === 0 || variantsUpdated === variantsChecked ? "SUCCESS" : "PARTIAL";
        return await finaSyncRepository.finishRun(run.id, {
          status,
          finishedAt: new Date(),
          variantsChecked,
          variantsUpdated,
          errorMessage: null,
        });
      } catch (err) {
        const message = err instanceof FinaApiError ? err.message : "მოულოდნელი შეცდომა FINA სინქრონიზაციისას";
        logger.error({ err }, "FINA sync failed");
        return await finaSyncRepository.finishRun(run.id, {
          status: "FAILED",
          finishedAt: new Date(),
          variantsChecked,
          variantsUpdated: 0,
          errorMessage: message,
        });
      }
    },
    { timeout: 5 * 60 * 1000, maxWait: 10_000 },
  );
}

export function listSyncRuns(limit = 50) {
  return finaSyncRepository.listRuns(limit);
}

// Live per-item stock refresh for checkout (cart→checkout entry and right
// before order placement — see orders.service.ts's computeCheckoutTotals),
// distinct from runSync's full-catalog admin job above: scoped to just the
// cart's variants (only their FINA products are requested), and NOT logged
// as a FinaSyncRun on success. This is what keeps register sales from being
// oversold online between scheduled syncs. Never throws on missing config or
// a failed FINA call — the caller falls back to whatever stockQuantity is
// already in the DB rather than failing checkout over an external API
// hiccup. The boolean return (placeOrder's CONFIRMED-vs-PENDING decision —
// see orders.service.ts) reports whether FINA was actually reached and
// confirmed *something*, not just "no error was thrown".
const RECENT_SYNC_TTL_MS = 20_000;
// Beyond this many remembered carts, expired entries are swept — the maps
// are keyed by cart contents, so without it they'd only ever grow.
const RECENT_SYNC_MAX_ENTRIES = 500;
const recentSyncAt = new Map<string, number>();
const recentSyncConfirmed = new Map<string, boolean>();

function syncThrottleKey(variantIds: number[]): string {
  return [...variantIds].sort((a, b) => a - b).join(",");
}

function pruneRecentSyncs(now: number) {
  if (recentSyncAt.size <= RECENT_SYNC_MAX_ENTRIES) return;
  for (const [key, at] of recentSyncAt) {
    if (now - at >= RECENT_SYNC_TTL_MS) {
      recentSyncAt.delete(key);
      recentSyncConfirmed.delete(key);
    }
  }
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
  pruneRecentSyncs(now);
  recentSyncAt.set(key, now);

  try {
    const variants = await finaSyncRepository.findLinkedVariantsByIds(variantIds);
    if (variants.length === 0) {
      // None of these variants are FINA-linked at all — nothing for FINA to
      // confirm, so this isn't a "confirmation" either way.
      recentSyncConfirmed.set(key, false);
      return false;
    }

    const snapshotTakenAt = new Date();
    const availability = await fetchStoreAvailability(variants.map((variant) => variant.finaId!));
    await applyAvailability(variants, availability, snapshotTakenAt);

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

// Shared by the admin's per-order and per-product "re-check FINA stock"
// actions below — a deliberate admin click with its own error toast, so a
// FINA failure surfaces as a thrown ApiError rather than degrading silently.
async function syncVariantsForAdmin(
  variants: { id: number; finaId: number | null; stockQuantity: number }[],
  logLabel: string,
): Promise<OrderStockSyncResult> {
  if (variants.length === 0) {
    return { checked: 0, updated: 0, items: [] };
  }

  try {
    const snapshotTakenAt = new Date();
    const availability = await fetchStoreAvailability(variants.map((variant) => variant.finaId!));
    const results = await applyAvailability(variants, availability, snapshotTakenAt);
    const resultById = new Map(results.map((result) => [result.id, result]));

    return {
      checked: variants.length,
      updated: results.length,
      items: variants.map((variant) => {
        const result = resultById.get(variant.id);
        return {
          productVariantId: variant.id,
          previousStock: result?.previousStock ?? variant.stockQuantity,
          newStock: result?.newStock ?? null,
        };
      }),
    };
  } catch (err) {
    const message = err instanceof FinaApiError ? err.message : "მოულოდნელი შეცდომა FINA სინქრონიზაციისას";
    logger.error({ err }, logLabel);
    throw new ApiError(502, message);
  }
}

// Admin order-detail action (see fina-sync.controller.ts's syncOrder) — an
// on-demand re-check of FINA stock for just this order's FINA-linked
// variants.
export async function syncOrderStock(orderId: number): Promise<OrderStockSyncResult> {
  if (!isFinaConfigured()) {
    throw new ApiError(400, "FINA სინქრონიზაცია არ არის კონფიგურირებული");
  }
  const variants = await finaSyncRepository.findLinkedVariantsForOrder(orderId);
  return syncVariantsForAdmin(variants, "FINA order stock sync failed");
}

// Admin product-detail action (see fina-sync.controller.ts's syncProduct) —
// same, scoped to one Product's own FINA-linked variants.
export async function syncProductStock(productId: number): Promise<OrderStockSyncResult> {
  if (!isFinaConfigured()) {
    throw new ApiError(400, "FINA სინქრონიზაცია არ არის კონფიგურირებული");
  }
  const variants = await finaSyncRepository.findLinkedVariantsByProduct(productId);
  return syncVariantsForAdmin(variants, "FINA product stock sync failed");
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

// Shared by the sale/return attempts below — resolves each order line
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
// Distinct from a real FINA API failure: an automatic push (runOrderPush) treats
// this as "nothing to push" (order becomes NOT_APPLICABLE), while
// retryOrderFinaPush surfaces it to the admin as a 400 explaining why a
// manual retry isn't possible, rather than a 502 implying FINA itself is
// unreachable.
//
// `deferred`: not "nothing to push" but "can't push YET" — the FINA
// web-customer/user Settings aren't filled in. The order stays PENDING (and
// keeps counting against FINA stock in applyFinaAvailability, since the
// sale really happened) until an admin fills them in.
class FinaPushSkipped extends Error {
  constructor(
    message: string,
    readonly deferred = false,
  ) {
    super(message);
  }
}

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
    throw new FinaPushSkipped("FINA-ს პარამეტრებში მყიდველისა და მომხმარებლის ID არ არის შევსებული", true);
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
  await finaSyncRepository.recordOrderSaleSynced(order.id, finaOutOperationId);
  return finaOutOperationId;
}

// Mirrors an order's local stock-restore-on-cancel (see orders-admin.service.ts's
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
  await finaSyncRepository.recordOrderReturnSynced(order.id);
}

// Whether a just-placed order has anything FINA could need — decides if
// placeOrder writes it as PENDING (outbox) in its own transaction. Cheap and
// synchronous on purpose; the finer checks (Settings filled in, variants
// actually FINA-linked) happen at push time, which downgrades the order to
// NOT_APPLICABLE when they don't hold.
export function orderNeedsFinaPush(items: { productVariantId?: number | null }[]): boolean {
  return isFinaConfigured() && items.some((item) => item.productVariantId != null);
}

type OrderPushMode = "automatic" | "manual";

// One push attempt for whatever this order's current state needs — the
// return once it's cancelled, the sale otherwise — under the order's push
// lease. "automatic" (right after placement/cancellation, and the sweep)
// never throws: a failure counts an attempt and leaves the order PENDING for
// the next sweep, until FINA_ORDER_PUSH_MAX_ATTEMPTS marks it FAILED.
// "manual" (the admin's retry button) surfaces every outcome as an
// ApiError for the admin's toast.
async function runOrderPush(orderId: number, mode: OrderPushMode): Promise<void> {
  const claimable: FinaOrderSyncStatus[] = mode === "manual" ? ["PENDING", "FAILED"] : ["PENDING"];
  const claimed = await finaSyncRepository.claimOrderPush(orderId, claimable, FINA_ORDER_PUSH_LEASE_MS);
  if (!claimed) {
    if (mode === "automatic") return;
    const current = await finaSyncRepository.findOrderForPush(orderId);
    if (current?.finaSyncStatus === "SYNCED") {
      throw new ApiError(400, "ეს შეკვეთა უკვე დასინქრონებულია FINA-სთან — ხელახლა გაგზავნა საჭირო არ არის");
    }
    if (current?.finaPushLockedUntil && current.finaPushLockedUntil > new Date()) {
      throw new ApiError(429, "ამ შეკვეთაზე უკვე მიმდინარეობს გაგზავნა FINA-ში — მოითმინეთ და თავიდან სცადეთ");
    }
    throw new ApiError(400, "ამ შეკვეთისთვის FINA-ში გასაგზავნი არაფერია");
  }

  const order = await finaSyncRepository.findOrderForPush(orderId);
  if (!order) return;
  const input = {
    id: order.id,
    orderCode: order.orderCode,
    finaOutOperationId: order.finaOutOperationId,
    items: order.items.map((item) => ({
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  };

  try {
    if (order.cancelledAt) {
      await attemptOrderReturnPush(input);
    } else {
      await attemptOrderSalePush(input);
    }
  } catch (err) {
    if (err instanceof FinaPushSkipped) {
      if (err.deferred) {
        await finaSyncRepository.deferOrderPush(orderId, err.message);
      } else if (mode === "automatic") {
        await finaSyncRepository.setOrderFinaSyncStatus(orderId, "NOT_APPLICABLE");
      } else {
        await finaSyncRepository.releaseOrderPushLease(orderId);
      }
      if (mode === "manual") throw new ApiError(400, err.message);
      return;
    }

    logger.error({ err, orderId, mode }, "FINA order push failed");
    const baseMessage =
      err instanceof FinaApiError ? err.message : "მოულოდნელი შეცდომა FINA-სთან კავშირისას";
    // Only a failure that definitely recorded nothing in FINA is retried
    // automatically. An ambiguous one (timeout, dropped connection, 5xx)
    // may already have created the document — retrying blindly could
    // record the sale/return twice — so it stops at FAILED for the admin
    // to check FINA first (the message says so).
    const safeToRetry = err instanceof FinaApiError && err.safeToRetry;
    const lastError = safeToRetry
      ? baseMessage
      : `${baseMessage}. პასუხი არ მიგვიღია — შესაძლოა FINA-ში დოკუმენტი („${
          order.cancelledAt ? "შეკვეთის გაუქმება" : "ვების შეკვეთა"
        } № ${order.orderCode}“) უკვე შეიქმნა. ხელით გაგზავნამდე შეამოწმეთ FINA-ში.`;
    const attempts = order.finaPushAttempts + 1;
    const exhausted = mode === "manual" || !safeToRetry || attempts >= FINA_ORDER_PUSH_MAX_ATTEMPTS;
    await finaSyncRepository.recordOrderPushFailure(
      orderId,
      exhausted ? "FAILED" : "PENDING",
      attempts,
      lastError,
    );
    if (mode === "manual") {
      throw new ApiError(502, lastError);
    }
  }
}

// Fired right after placeOrder / a cancellation commits (both wrote the
// order as PENDING in their own transaction). Never throws — a FINA outage
// never blocks checkout or the admin's status change; whatever this attempt
// can't finish, the sweep below picks up.
export async function processOrderFinaPush(orderId: number): Promise<void> {
  try {
    await runOrderPush(orderId, "automatic");
  } catch (err) {
    logger.error({ err, orderId }, "FINA order push crashed");
  }
}

// The outbox sweep (scheduled from server.ts, interval admin-configurable
// via Settings' finaOrderPushRetryIntervalMinutes) — retries every order
// still PENDING: a failed attempt, or one that never ran because the
// process restarted between commit and push. One at a time; a typical run
// finds nothing and costs a single indexed query.
export async function processDueFinaOrderPushes(): Promise<void> {
  const orderIds = await finaSyncRepository.findDueOrderPushIds(FINA_ORDER_PUSH_SWEEP_BATCH);
  for (const orderId of orderIds) {
    await processOrderFinaPush(orderId);
  }
}

// Admin-triggered manual retry (see orders-admin.service.ts's
// retryOrderFinaSync, wired to the order-detail "ხელით გაშვება FINA-ში"
// button) — for a FAILED order, or a PENDING one the admin doesn't want to
// wait on. Same push and same lease as the automatic paths, so it can't
// double-send alongside them; errors are thrown for the admin's toast.
export async function retryOrderFinaPush(orderId: number): Promise<void> {
  await runOrderPush(orderId, "manual");
}

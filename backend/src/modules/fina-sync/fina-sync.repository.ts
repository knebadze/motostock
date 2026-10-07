import { prisma } from "../../config/prisma.js";
import { Prisma, type FinaOrderSyncStatus, type FinaSyncStatus, type FinaSyncTrigger } from "../../generated/prisma/index.js";

// User has no `name` column (only firstName/lastName) — select:{id,name:true}
// here would throw a Prisma validation error on every single call site
// below, always, regardless of environment (verified live). Select the real
// columns and compute the display name here instead.
const triggeredBySelect = { id: true, firstName: true, lastName: true } as const;

function withTriggeredByName<
  T extends { triggeredBy: { id: number; firstName: string; lastName: string } | null },
>(row: T) {
  return {
    ...row,
    triggeredBy: row.triggeredBy
      ? { id: row.triggeredBy.id, name: `${row.triggeredBy.firstName} ${row.triggeredBy.lastName}` }
      : null,
  };
}

export const finaSyncRepository = {
  findLinkedVariants() {
    return prisma.productVariant.findMany({
      where: { finaId: { not: null } },
      select: { id: true, finaId: true },
    });
  },

  findLinkedVariantsByIds(ids: number[]) {
    return prisma.productVariant.findMany({
      where: { id: { in: ids }, finaId: { not: null } },
      select: { id: true, finaId: true },
    });
  },

  findLinkedVariantsForOrder(orderId: number) {
    return prisma.productVariant.findMany({
      where: { finaId: { not: null }, orderItems: { some: { orderId } } },
      select: { id: true, finaId: true, stockQuantity: true },
    });
  },

  findLinkedVariantsByProduct(productId: number) {
    return prisma.productVariant.findMany({
      where: { finaId: { not: null }, productId },
      select: { id: true, finaId: true, stockQuantity: true },
    });
  },

  // The ONE place FINA stock is written into ProductVariant.stockQuantity
  // (scheduled/manual sync, checkout refresh, admin per-order/per-product
  // re-checks all go through here). `available` is FINA's sellable quantity
  // for the variant (rest - reserve, see fina-sync.service.ts) in a snapshot
  // requested at `snapshot.takenAt` and answered by `snapshot.finishedAt`.
  //
  // FINA's number can't simply be copied over: web orders FINA hasn't
  // recorded yet still have to count. Per FINA-tracked order touching the
  // variant (finaSyncStatus <> NOT_APPLICABLE), comparing what the site has
  // already applied locally with what the snapshot already contains:
  //   - not cancelled, sale NOT in the snapshot (push pending/failed, or
  //     recorded after the snapshot was taken)        -> -quantity
  //   - cancelled, sale in the snapshot but its return NOT (return
  //     pending/failed, or sent after the snapshot)   -> +quantity
  //   - everything else is already consistent            -> 0
  // Every borderline case errs LOW (never oversells):
  //   - a sale counts as in the snapshot only if FINA confirmed it before the
  //     snapshot was even requested (finaSaleSyncedAt < takenAt);
  //   - a return counts as in it if it was SENT before the snapshot came back
  //     (finaReturnSyncedAt holds the send time; < finishedAt) — or if its
  //     outcome is uncertain (finaPushUncertain: FINA may well have it).
  // A document whose time is unknown (pushed before these columns existed,
  // or confirmed by an admin after the fact) counts as in.
  //
  // The variant rows are locked (FOR UPDATE, id order) before that
  // adjustment is computed, so an order placed concurrently either committed
  // first (and is counted) or waits for this write and then decrements the
  // new value - it can never be overwritten. placeOrder/cancel lock variants
  // in the same id order, so the two can't deadlock. A row last written from
  // a NEWER snapshot (finaSnapshotAt) is skipped: a slow full sync must not
  // undo a checkout refresh's fresher numbers.
  //
  // Also flips the SOLD/AVAILABLE listing status the same way placeOrder/
  // cancel do (only those two auto-managed values - never a status an admin
  // set by hand).
  async applyFinaAvailability(
    entries: { variantId: number; available: number }[],
    snapshot: { takenAt: Date; finishedAt: Date },
    listingStatusIds: { sold: number; available: number } | null,
  ): Promise<{ id: number; previousStock: number; newStock: number }[]> {
    if (entries.length === 0) return [];
    const availableById = new Map(entries.map((entry) => [entry.variantId, entry.available]));
    const ids = [...availableById.keys()].sort((a, b) => a - b);
    const idList = Prisma.join(ids);
    const { takenAt, finishedAt } = snapshot;

    return prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<{ id: number; stockQuantity: number; finaSnapshotAt: Date | null }[]>`
          SELECT id, "stockQuantity", "finaSnapshotAt" FROM "dbo"."ProductVariant"
          WHERE id IN (${idList})
          ORDER BY id
          FOR UPDATE
        `;
        const writable = locked.filter((row) => row.finaSnapshotAt == null || row.finaSnapshotAt <= takenAt);
        if (writable.length === 0) return [];
        const writableIdList = Prisma.join(writable.map((row) => row.id));

        const saleInSnapshot = Prisma.sql`(o."finaOutOperationId" IS NOT NULL AND (o."finaSaleSyncedAt" IS NULL OR o."finaSaleSyncedAt" < ${takenAt}))`;
        const returnInSnapshot = Prisma.sql`(o."finaPushUncertain" OR (o."finaSyncStatus" = 'SYNCED' AND (o."finaReturnSyncedAt" IS NULL OR o."finaReturnSyncedAt" < ${finishedAt})))`;
        // The first OR-group is an index-friendly superset of the two exact
        // cases after it: every order that can be out of step is either
        // still being pushed, or had a document recorded after the snapshot.
        const adjustments = await tx.$queryRaw<{ id: number; adjustment: number }[]>`
          SELECT oi."productVariantId" AS id,
                 SUM(CASE WHEN o."cancelledAt" IS NULL THEN -oi.quantity ELSE oi.quantity END)::int AS adjustment
          FROM "dbo"."OrderItem" oi
          JOIN "dbo"."Order" o ON o.id = oi."orderId"
          WHERE oi."productVariantId" IN (${writableIdList})
            AND o."finaSyncStatus" <> 'NOT_APPLICABLE'
            AND (
              o."finaSyncStatus" IN ('PENDING', 'FAILED')
              OR o."finaSaleSyncedAt" >= ${takenAt}
              OR o."finaReturnSyncedAt" >= ${finishedAt}
            )
            AND (
              (o."cancelledAt" IS NULL AND NOT ${saleInSnapshot})
              OR (o."cancelledAt" IS NOT NULL AND ${saleInSnapshot} AND NOT ${returnInSnapshot})
            )
          GROUP BY oi."productVariantId"
        `;
        const adjustmentById = new Map(adjustments.map((row) => [row.id, row.adjustment]));

        const results = writable.map((row) => ({
          id: row.id,
          previousStock: row.stockQuantity,
          newStock: Math.max(0, availableById.get(row.id)! + (adjustmentById.get(row.id) ?? 0)),
        }));

        // Explicit ::int casts - without them Postgres can't infer a type
        // for the parameters inside a bare VALUES list and defaults to text
        // ("operator does not exist: integer = text").
        const values = Prisma.join(results.map((row) => Prisma.sql`(${row.id}::int, ${row.newStock}::int)`));
        await tx.$executeRaw`
          UPDATE "dbo"."ProductVariant" AS pv
          SET "stockQuantity" = v.stock, "finaSnapshotAt" = ${takenAt}
          FROM (VALUES ${values}) AS v(id, stock)
          WHERE pv.id = v.id
        `;

        if (listingStatusIds) {
          const writtenIds = results.map((row) => row.id);
          await tx.productVariant.updateMany({
            where: { id: { in: writtenIds }, statusId: listingStatusIds.sold, stockQuantity: { gt: 0 } },
            data: { statusId: listingStatusIds.available },
          });
          await tx.productVariant.updateMany({
            where: { id: { in: writtenIds }, statusId: listingStatusIds.available, stockQuantity: { lte: 0 } },
            data: { statusId: listingStatusIds.sold },
          });
        }

        return results;
      },
      // Locks are held only for a couple of queries/updates - a concurrent
      // checkout waits milliseconds, not the FINA round-trip (that already
      // happened before this transaction started).
      { timeout: 30_000, maxWait: 10_000 },
    );
  },

  // Final outcome of a push (NOT_APPLICABLE when there turned out to be
  // nothing to push) — also releases the lease, resets the attempt counter
  // and clears any error/uncertainty.
  setOrderFinaSyncStatus(orderId: number, status: FinaOrderSyncStatus) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        finaSyncStatus: status,
        finaPushAttempts: 0,
        finaPushLockedUntil: null,
        finaLastError: null,
        finaPushUncertain: false,
      },
    });
  },

  // A successful RETURN push. `sentAt` is when the request was SENT, not
  // when FINA answered — see applyFinaAvailability for why that's the safe
  // side for returns.
  recordOrderReturnSynced(orderId: number, sentAt: Date) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        finaSyncStatus: "SYNCED",
        finaReturnSyncedAt: sentAt,
        finaPushAttempts: 0,
        finaPushLockedUntil: null,
        finaLastError: null,
        finaPushUncertain: false,
      },
    });
  },

  // A successful SALE push. Conditional on the order still not being
  // cancelled, in one statement: if a cancellation committed while the sale
  // was in flight, it already re-queued the order as PENDING (see
  // orders.repository.ts's updateStatus) and marking it SYNCED here would
  // swallow the return push it now needs. The FINA operation id is stored
  // either way — that return references it as out_id — and so is each
  // line's FINA product id, which that return is built from.
  async recordOrderSaleSynced(
    orderId: number,
    finaOutOperationId: number,
    itemFinaProductIds: { itemId: number; finaProductId: number }[],
  ) {
    const synced = {
      finaOutOperationId,
      finaSaleSyncedAt: new Date(),
      finaPushAttempts: 0,
      finaPushLockedUntil: null,
      finaLastError: null,
      finaPushUncertain: false,
    };
    await prisma.$transaction(async (tx) => {
      for (const item of itemFinaProductIds) {
        await tx.orderItem.update({ where: { id: item.itemId }, data: { finaProductId: item.finaProductId } });
      }
      const result = await tx.order.updateMany({
        where: { id: orderId, cancelledAt: null },
        data: { ...synced, finaSyncStatus: "SYNCED" },
      });
      if (result.count === 0) {
        await tx.order.update({ where: { id: orderId }, data: { ...synced, finaSyncStatus: "PENDING" } });
      }
    });
  },

  // `uncertain`: FINA may have recorded the document anyway (see
  // finaPushUncertain) — such a failure is never retried automatically.
  recordOrderPushFailure(
    orderId: number,
    status: "PENDING" | "FAILED",
    attempts: number,
    lastError: string,
    uncertain: boolean,
  ) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        finaSyncStatus: status,
        finaPushAttempts: attempts,
        finaPushLockedUntil: null,
        finaLastError: lastError,
        finaPushUncertain: uncertain,
      },
    });
  },

  // A push that can't run yet for a reason that isn't a failure (FINA
  // web-customer/user Settings not filled in) - stays PENDING, attempt not
  // counted, reason shown to the admin.
  deferOrderPush(orderId: number, reason: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: { finaPushLockedUntil: null, finaLastError: reason },
    });
  },

  releaseOrderPushLease(orderId: number) {
    return prisma.order.update({ where: { id: orderId }, data: { finaPushLockedUntil: null } });
  },

  // Takes the order's push lease — an atomic compare-and-set, so exactly one
  // of the immediate push / the sweep / a manual retry wins and the others
  // back off, without holding a DB connection (or an advisory lock) open for
  // the length of the external FINA call.
  //
  // Every normal end of a push clears the lease, so a lease that is set but
  // EXPIRED means the previous attempt died mid-call (process killed, DB
  // down) — FINA may or may not have saved that document. Re-sending could
  // record it twice, so such an order is NOT claimed: it's marked FAILED +
  // uncertain for the admin to check FINA ("abandoned").
  async claimOrderPush(
    orderId: number,
    statuses: FinaOrderSyncStatus[],
    leaseMs: number,
    abandonedMessage: string,
  ): Promise<"claimed" | "abandoned" | "unavailable"> {
    const now = new Date();
    const claimed = await prisma.order.updateMany({
      where: { id: orderId, finaSyncStatus: { in: statuses }, finaPushLockedUntil: null },
      data: { finaPushLockedUntil: new Date(now.getTime() + leaseMs) },
    });
    if (claimed.count === 1) return "claimed";

    const abandoned = await prisma.order.updateMany({
      where: { id: orderId, finaSyncStatus: { in: statuses }, finaPushLockedUntil: { lt: now } },
      data: {
        finaSyncStatus: "FAILED",
        finaPushLockedUntil: null,
        finaPushUncertain: true,
        finaLastError: abandonedMessage,
      },
    });
    return abandoned.count === 1 ? "abandoned" : "unavailable";
  },

  findOrderForPush(orderId: number) {
    return prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderCode: true,
        finaOutOperationId: true,
        finaSyncStatus: true,
        finaPushAttempts: true,
        finaPushLockedUntil: true,
        finaPushUncertain: true,
        cancelledAt: true,
        items: {
          select: { id: true, productVariantId: true, quantity: true, unitPrice: true, finaProductId: true },
        },
      },
    });
  },

  // Admin resolution of an uncertain push (fina-sync.service.ts's
  // resolveOrderFinaPush) — "FINA has it": the document's time is unknown,
  // so its synced-at is left null, which stock sync reads as "already in
  // every snapshot" (true: it was saved back when the push ran).
  resolveSaleRecorded(
    orderId: number,
    finaOutOperationId: number,
    nextStatus: "SYNCED" | "PENDING",
    itemFinaProductIds: { itemId: number; finaProductId: number }[],
  ) {
    return prisma.$transaction(async (tx) => {
      for (const item of itemFinaProductIds) {
        await tx.orderItem.update({ where: { id: item.itemId }, data: { finaProductId: item.finaProductId } });
      }
      await tx.order.update({
        where: { id: orderId },
        data: {
          finaOutOperationId,
          finaSaleSyncedAt: null,
          finaSyncStatus: nextStatus,
          finaPushAttempts: 0,
          finaPushLockedUntil: null,
          finaLastError: null,
          finaPushUncertain: false,
        },
      });
    });
  },

  resolveReturnRecorded(orderId: number) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        finaReturnSyncedAt: null,
        finaSyncStatus: "SYNCED",
        finaPushAttempts: 0,
        finaPushLockedUntil: null,
        finaLastError: null,
        finaPushUncertain: false,
      },
    });
  },

  async findDueOrderPushIds(limit: number): Promise<number[]> {
    const rows = await prisma.order.findMany({
      where: {
        finaSyncStatus: "PENDING",
        OR: [{ finaPushLockedUntil: null }, { finaPushLockedUntil: { lt: new Date() } }],
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: limit,
    });
    return rows.map((row) => row.id);
  },

  async createRun(data: {
    trigger: FinaSyncTrigger;
    status: FinaSyncStatus;
    finishedAt: Date;
    variantsChecked: number;
    variantsUpdated: number;
    errorMessage: string | null;
    triggeredById: number | null;
  }) {
    const row = await prisma.finaSyncRun.create({
      data,
      include: { triggeredBy: { select: triggeredBySelect } },
    });
    return withTriggeredByName(row);
  },

  // Written up front by runSync, before its external FINA call — see
  // fina-sync.service.ts and FinaSyncStatus.RUNNING's comment. Paired with
  // finishRun below, which the same run later updates to its real outcome.
  async createRunningRun(data: {
    trigger: FinaSyncTrigger;
    variantsChecked: number;
    triggeredById: number | null;
  }) {
    const row = await prisma.finaSyncRun.create({
      data: { ...data, status: "RUNNING", finishedAt: null, variantsUpdated: 0, errorMessage: null },
      include: { triggeredBy: { select: triggeredBySelect } },
    });
    return withTriggeredByName(row);
  },

  async finishRun(
    id: number,
    data: {
      status: FinaSyncStatus;
      finishedAt: Date;
      variantsChecked: number;
      variantsUpdated: number;
      errorMessage: string | null;
    },
  ) {
    const row = await prisma.finaSyncRun.update({
      where: { id },
      data,
      include: { triggeredBy: { select: triggeredBySelect } },
    });
    return withTriggeredByName(row);
  },

  async listRuns(limit: number) {
    const rows = await prisma.finaSyncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
      include: { triggeredBy: { select: triggeredBySelect } },
    });
    return rows.map(withTriggeredByName);
  },
};

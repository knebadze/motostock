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
  // for the variant (rest - reserve, see fina-sync.service.ts) as of
  // `snapshotTakenAt` - taken BEFORE the FINA request was sent.
  //
  // FINA's number can't simply be copied over: web orders FINA hasn't
  // recorded yet still have to count. Per FINA-tracked order touching the
  // variant (finaSyncStatus <> NOT_APPLICABLE), comparing what the site has
  // already applied locally with what the snapshot already contains:
  //   - not cancelled, sale NOT in the snapshot (push pending/failed, or
  //     recorded after the snapshot was taken)        -> -quantity
  //   - cancelled, sale in the snapshot but its return NOT (return
  //     pending/failed, or recorded after the snapshot) -> +quantity
  //   - everything else is already consistent            -> 0
  // "In the snapshot" = recorded before snapshotTakenAt; a document whose
  // synced-at is unknown (pushed before these columns existed) counts as in.
  //
  // The variant rows are locked (FOR UPDATE, id order) before that
  // adjustment is computed, so an order placed concurrently either committed
  // first (and is counted) or waits for this write and then decrements the
  // new value - it can never be overwritten. placeOrder/cancel lock variants
  // in the same id order, so the two can't deadlock.
  //
  // Also flips the SOLD/AVAILABLE listing status the same way placeOrder/
  // cancel do (only those two auto-managed values - never a status an admin
  // set by hand).
  async applyFinaAvailability(
    entries: { variantId: number; available: number }[],
    snapshotTakenAt: Date,
    listingStatusIds: { sold: number; available: number } | null,
  ): Promise<{ id: number; previousStock: number; newStock: number }[]> {
    if (entries.length === 0) return [];
    const availableById = new Map(entries.map((entry) => [entry.variantId, entry.available]));
    const ids = [...availableById.keys()].sort((a, b) => a - b);
    const idList = Prisma.join(ids);

    return prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<{ id: number; stockQuantity: number }[]>`
          SELECT id, "stockQuantity" FROM "dbo"."ProductVariant"
          WHERE id IN (${idList})
          ORDER BY id
          FOR UPDATE
        `;
        if (locked.length === 0) return [];

        const saleInSnapshot = Prisma.sql`(o."finaOutOperationId" IS NOT NULL AND (o."finaSaleSyncedAt" IS NULL OR o."finaSaleSyncedAt" < ${snapshotTakenAt}))`;
        const returnInSnapshot = Prisma.sql`(o."finaSyncStatus" = 'SYNCED' AND (o."finaReturnSyncedAt" IS NULL OR o."finaReturnSyncedAt" < ${snapshotTakenAt}))`;
        // The first OR-group is an index-friendly superset of the two exact
        // cases after it: every order that can be out of step is either
        // still being pushed, or had a document recorded after the snapshot.
        const adjustments = await tx.$queryRaw<{ id: number; adjustment: number }[]>`
          SELECT oi."productVariantId" AS id,
                 SUM(CASE WHEN o."cancelledAt" IS NULL THEN -oi.quantity ELSE oi.quantity END)::int AS adjustment
          FROM "dbo"."OrderItem" oi
          JOIN "dbo"."Order" o ON o.id = oi."orderId"
          WHERE oi."productVariantId" IN (${idList})
            AND o."finaSyncStatus" <> 'NOT_APPLICABLE'
            AND (
              o."finaSyncStatus" IN ('PENDING', 'FAILED')
              OR o."finaSaleSyncedAt" >= ${snapshotTakenAt}
              OR o."finaReturnSyncedAt" >= ${snapshotTakenAt}
            )
            AND (
              (o."cancelledAt" IS NULL AND NOT ${saleInSnapshot})
              OR (o."cancelledAt" IS NOT NULL AND ${saleInSnapshot} AND NOT ${returnInSnapshot})
            )
          GROUP BY oi."productVariantId"
        `;
        const adjustmentById = new Map(adjustments.map((row) => [row.id, row.adjustment]));

        const results = locked.map((row) => ({
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
          SET "stockQuantity" = v.stock
          FROM (VALUES ${values}) AS v(id, stock)
          WHERE pv.id = v.id
        `;

        if (listingStatusIds) {
          await tx.productVariant.updateMany({
            where: { id: { in: ids }, statusId: listingStatusIds.sold, stockQuantity: { gt: 0 } },
            data: { statusId: listingStatusIds.available },
          });
          await tx.productVariant.updateMany({
            where: { id: { in: ids }, statusId: listingStatusIds.available, stockQuantity: { lte: 0 } },
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

  // Final outcome of a push (SYNCED after a return, or NOT_APPLICABLE when
  // there turned out to be nothing to push) — also releases the push lease
  // and resets the attempt counter.
  setOrderFinaSyncStatus(orderId: number, status: FinaOrderSyncStatus) {
    return prisma.order.update({
      where: { id: orderId },
      data: { finaSyncStatus: status, finaPushAttempts: 0, finaPushLockedUntil: null, finaLastError: null },
    });
  },

  // A successful RETURN push - synced-at feeds applyFinaAvailability.
  recordOrderReturnSynced(orderId: number) {
    return prisma.order.update({
      where: { id: orderId },
      data: {
        finaSyncStatus: "SYNCED",
        finaReturnSyncedAt: new Date(),
        finaPushAttempts: 0,
        finaPushLockedUntil: null,
        finaLastError: null,
      },
    });
  },

  // A successful SALE push. Conditional on the order still not being
  // cancelled, in one statement: if a cancellation committed while the sale
  // was in flight, it already re-queued the order as PENDING (see
  // orders.repository.ts's updateStatus) and marking it SYNCED here would
  // swallow the return push it now needs. The FINA operation id is stored
  // either way — that return references it as out_id.
  async recordOrderSaleSynced(orderId: number, finaOutOperationId: number) {
    const synced = {
      finaOutOperationId,
      finaSaleSyncedAt: new Date(),
      finaPushAttempts: 0,
      finaPushLockedUntil: null,
      finaLastError: null,
    };
    const result = await prisma.order.updateMany({
      where: { id: orderId, cancelledAt: null },
      data: { ...synced, finaSyncStatus: "SYNCED" },
    });
    if (result.count === 0) {
      await prisma.order.update({ where: { id: orderId }, data: { ...synced, finaSyncStatus: "PENDING" } });
    }
  },

  recordOrderPushFailure(
    orderId: number,
    status: "PENDING" | "FAILED",
    attempts: number,
    lastError: string,
  ) {
    return prisma.order.update({
      where: { id: orderId },
      data: { finaSyncStatus: status, finaPushAttempts: attempts, finaPushLockedUntil: null, finaLastError: lastError },
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
  // the length of the external FINA call. An expired lease (process killed
  // mid-push) is claimable again.
  async claimOrderPush(
    orderId: number,
    statuses: FinaOrderSyncStatus[],
    leaseMs: number,
  ): Promise<boolean> {
    const now = new Date();
    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        finaSyncStatus: { in: statuses },
        OR: [{ finaPushLockedUntil: null }, { finaPushLockedUntil: { lt: now } }],
      },
      data: { finaPushLockedUntil: new Date(now.getTime() + leaseMs) },
    });
    return result.count === 1;
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
        cancelledAt: true,
        items: { select: { productVariantId: true, quantity: true, unitPrice: true } },
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

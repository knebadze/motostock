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

  updateStock(id: number, stockQuantity: number) {
    return prisma.productVariant.update({ where: { id }, data: { stockQuantity } });
  },

  // One round trip for every linked variant instead of one UPDATE per
  // variant (see fina-sync.service.ts's runSync, which used to loop
  // updateStock above once per variant) — a full-catalog sync could mean
  // thousands of sequential round trips, needlessly keeping runSync's
  // transaction (and the pool connection + advisory lock it holds) open far
  // longer than the actual work requires. Uses the plain `prisma` client,
  // not a passed-in transaction — same as updateStock above — so it commits
  // on its own as soon as it completes, independent of the wrapping
  // transaction's lifetime.
  async updateStockBatch(updates: { id: number; stockQuantity: number }[]): Promise<void> {
    if (updates.length === 0) return;
    // Explicit ::int casts — without them Postgres can't infer a type for
    // the raw query's parameter placeholders inside a bare VALUES list and
    // defaults to text, which then fails to compare against pv.id
    // (integer) with "operator does not exist: integer = text". Verified
    // live against the dev DB before relying on this.
    const rows = Prisma.join(
      updates.map((u) => Prisma.sql`(${u.id}::int, ${u.stockQuantity}::int)`),
    );
    await prisma.$executeRaw`
      UPDATE "dbo"."ProductVariant" AS pv
      SET "stockQuantity" = v.stock
      FROM (VALUES ${rows}) AS v(id, stock)
      WHERE pv.id = v.id
    `;
  },

  // Final outcome of a push (SYNCED after a return, or NOT_APPLICABLE when
  // there turned out to be nothing to push) — also releases the push lease
  // and resets the attempt counter.
  setOrderFinaSyncStatus(orderId: number, status: FinaOrderSyncStatus) {
    return prisma.order.update({
      where: { id: orderId },
      data: { finaSyncStatus: status, finaPushAttempts: 0, finaPushLockedUntil: null },
    });
  },

  // A successful SALE push. Conditional on the order still not being
  // cancelled, in one statement: if a cancellation committed while the sale
  // was in flight, it already re-queued the order as PENDING (see
  // orders.repository.ts's updateStatus) and marking it SYNCED here would
  // swallow the return push it now needs. The FINA operation id is stored
  // either way — that return references it as out_id.
  async recordOrderSaleSynced(orderId: number, finaOutOperationId: number) {
    const result = await prisma.order.updateMany({
      where: { id: orderId, cancelledAt: null },
      data: { finaOutOperationId, finaSyncStatus: "SYNCED", finaPushAttempts: 0, finaPushLockedUntil: null },
    });
    if (result.count === 0) {
      await prisma.order.update({
        where: { id: orderId },
        data: { finaOutOperationId, finaSyncStatus: "PENDING", finaPushAttempts: 0, finaPushLockedUntil: null },
      });
    }
  },

  recordOrderPushFailure(orderId: number, status: "PENDING" | "FAILED", attempts: number) {
    return prisma.order.update({
      where: { id: orderId },
      data: { finaSyncStatus: status, finaPushAttempts: attempts, finaPushLockedUntil: null },
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

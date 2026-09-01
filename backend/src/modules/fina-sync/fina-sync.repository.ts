import { prisma } from "../../config/prisma.js";
import { Prisma, type FinaOrderSyncStatus, type FinaSyncStatus, type FinaSyncTrigger } from "../../generated/prisma/index.js";

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

  // finaOutOperationId is only ever passed on a successful sale push (SYNCED
  // from attemptOrderSalePush) — a return push or a FAILED transition never
  // touches it, so a prior successful sale's id survives a later failed
  // return-push attempt (still needed for the next retry's out_id).
  setOrderFinaSyncStatus(orderId: number, status: FinaOrderSyncStatus, finaOutOperationId?: number) {
    return prisma.order.update({
      where: { id: orderId },
      data: { finaSyncStatus: status, ...(finaOutOperationId != null ? { finaOutOperationId } : {}) },
    });
  },

  createRun(data: {
    trigger: FinaSyncTrigger;
    status: FinaSyncStatus;
    finishedAt: Date;
    variantsChecked: number;
    variantsUpdated: number;
    errorMessage: string | null;
    triggeredById: number | null;
  }) {
    return prisma.finaSyncRun.create({
      data,
      include: { triggeredBy: { select: { id: true, name: true } } },
    });
  },

  listRuns(limit: number) {
    return prisma.finaSyncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
      include: { triggeredBy: { select: { id: true, name: true } } },
    });
  },
};

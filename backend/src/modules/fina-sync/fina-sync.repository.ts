import { prisma } from "../../config/prisma.js";
import type { FinaOrderSyncStatus, FinaSyncStatus, FinaSyncTrigger } from "../../generated/prisma/index.js";

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

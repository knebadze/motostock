import { prisma } from "../../config/prisma.js";
import type { FinaSyncStatus, FinaSyncTrigger } from "../../generated/prisma/index.js";

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

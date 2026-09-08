import { prisma } from "../../config/prisma.js";
import { withNextSortOrderLock } from "../../lib/sortOrder.js";

type OrderStatusWriteData = {
  key?: string;
  nameKa?: string;
  nameEn?: string;
  nameRu?: string;
  sortOrder?: number;
};

export const orderStatusesRepository = {
  // id as a secondary sort key keeps ordering deterministic even if two
  // rows ever end up sharing a sortOrder — same reasoning as
  // homepage-sections.repository.ts's identical tiebreaker.
  findMany() {
    return prisma.orderStatus.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  },

  findById(id: number) {
    return prisma.orderStatus.findUnique({ where: { id } });
  },

  findByKey(key: string) {
    return prisma.orderStatus.findUnique({ where: { key } });
  },

  create(data: Required<Omit<OrderStatusWriteData, "sortOrder">>) {
    return withNextSortOrderLock("OrderStatus", async (tx) => {
      const { _max } = await tx.orderStatus.aggregate({ _max: { sortOrder: true } });
      return tx.orderStatus.create({ data: { ...data, sortOrder: (_max.sortOrder ?? -1) + 1 } });
    });
  },

  update(id: number, data: OrderStatusWriteData) {
    return prisma.orderStatus.update({ where: { id }, data });
  },

  // Swaps two rows' sortOrder in one transaction — same pattern as
  // homepage-sections.repository.ts's swapSortOrder, used by
  // moveOrderStatus (the admin's move-up/move-down control) so the pair
  // can never be observed (or left, on a mid-request failure) holding the
  // same sortOrder, the way two independent PATCH requests each updating
  // one row could.
  async swapSortOrder(a: { id: number; sortOrder: number }, b: { id: number; sortOrder: number }) {
    await prisma.$transaction([
      prisma.orderStatus.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
      prisma.orderStatus.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
    ]);
  },

  delete(id: number) {
    return prisma.orderStatus.delete({ where: { id } });
  },
};

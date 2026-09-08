import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";
import { withNextSortOrderLock } from "../../lib/sortOrder.js";

type ServiceTypeWriteData = {
  nameKa?: string;
  nameEn?: string;
  nameRu?: string;
  hasPositionOption?: boolean;
  hasFilterOption?: boolean;
  defaultPrice?: Prisma.Decimal | number | null;
  isActive?: boolean;
};

export const serviceTypesRepository = {
  findMany(onlyActive?: boolean) {
    return prisma.serviceType.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });
  },

  findById(id: number) {
    return prisma.serviceType.findUnique({ where: { id } });
  },

  create(data: Required<ServiceTypeWriteData>) {
    return withNextSortOrderLock("ServiceType", async (tx) => {
      const { _max } = await tx.serviceType.aggregate({ _max: { sortOrder: true } });
      return tx.serviceType.create({
        data: { ...data, sortOrder: (_max.sortOrder ?? -1) + 1 },
      });
    });
  },

  update(id: number, data: ServiceTypeWriteData) {
    return prisma.serviceType.update({ where: { id }, data });
  },

  async reorder(ids: number[]) {
    await Promise.all(
      ids.map((id, index) => prisma.serviceType.update({ where: { id }, data: { sortOrder: index } })),
    );
  },

  delete(id: number) {
    return prisma.serviceType.delete({ where: { id } });
  },
};

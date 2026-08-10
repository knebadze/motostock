import { prisma } from "../../config/prisma.js";

type OrderStatusWriteData = {
  key?: string;
  nameKa?: string;
  nameEn?: string;
  nameRu?: string;
  sortOrder?: number;
};

export const orderStatusesRepository = {
  findMany() {
    return prisma.orderStatus.findMany({ orderBy: { sortOrder: "asc" } });
  },

  findById(id: number) {
    return prisma.orderStatus.findUnique({ where: { id } });
  },

  findByKey(key: string) {
    return prisma.orderStatus.findUnique({ where: { key } });
  },

  async findMaxSortOrder(): Promise<number> {
    const top = await prisma.orderStatus.findFirst({ orderBy: { sortOrder: "desc" } });
    return top?.sortOrder ?? -1;
  },

  create(data: Required<Omit<OrderStatusWriteData, "sortOrder">> & { sortOrder: number }) {
    return prisma.orderStatus.create({ data });
  },

  update(id: number, data: OrderStatusWriteData) {
    return prisma.orderStatus.update({ where: { id }, data });
  },

  delete(id: number) {
    return prisma.orderStatus.delete({ where: { id } });
  },
};

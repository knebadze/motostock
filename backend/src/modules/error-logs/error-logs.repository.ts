import { prisma } from "../../config/prisma.js";

export const errorLogsRepository = {
  list(skip: number, take: number) {
    return prisma.errorLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  count() {
    return prisma.errorLog.count();
  },

  clear() {
    return prisma.errorLog.deleteMany();
  },

  async deleteCreatedBefore(cutoff: Date) {
    const { count } = await prisma.errorLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return count;
  },
};

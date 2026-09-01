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
};

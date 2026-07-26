import { prisma } from "../../config/prisma.js";

export const settingsRepository = {
  findByKey(key: string) {
    return prisma.setting.findUnique({ where: { key } });
  },

  upsert(key: string, value: string) {
    return prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  },
};

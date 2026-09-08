import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

type DbClient = typeof prisma | Prisma.TransactionClient;

export const settingsRepository = {
  findByKey(key: string) {
    return prisma.setting.findUnique({ where: { key } });
  },

  // `client` defaults to the plain prisma singleton (every pre-existing call
  // site keeps working unchanged) but accepts a transaction client too —
  // see settings.service.ts's updateSettings, which writes ~44 settings in
  // one $transaction so a failure partway through can't leave a mixed
  // old/new state with no rollback.
  upsert(key: string, value: string, client: DbClient = prisma) {
    return client.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  },

  delete(key: string, client: DbClient = prisma) {
    return client.setting.deleteMany({ where: { key } });
  },
};

import { prisma } from "../../config/prisma.js";
import { withNextSortOrderLock } from "../../lib/sortOrder.js";

type BankWriteData = {
  key?: string;
  nameKa?: string;
  nameEn?: string;
  nameRu?: string;
  isActive?: boolean;
  supportsInstallment?: boolean;
  supportsSplitPayment?: boolean;
};

export const banksRepository = {
  findMany(onlyActive?: boolean) {
    return prisma.bank.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });
  },

  findById(id: number) {
    return prisma.bank.findUnique({ where: { id } });
  },

  findByKey(key: string) {
    return prisma.bank.findUnique({ where: { key } });
  },

  create(data: Required<BankWriteData>) {
    return withNextSortOrderLock("Bank", async (tx) => {
      const { _max } = await tx.bank.aggregate({ _max: { sortOrder: true } });
      return tx.bank.create({
        data: { ...data, sortOrder: (_max.sortOrder ?? -1) + 1 },
      });
    });
  },

  update(id: number, data: BankWriteData) {
    return prisma.bank.update({ where: { id }, data });
  },

  updateLogo(id: number, logoUrl: string) {
    return prisma.bank.update({ where: { id }, data: { logoUrl } });
  },

  async reorder(ids: number[]) {
    await Promise.all(ids.map((id, index) => prisma.bank.update({ where: { id }, data: { sortOrder: index } })));
  },

  delete(id: number) {
    return prisma.bank.delete({ where: { id } });
  },
};

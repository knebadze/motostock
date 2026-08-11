import { Prisma } from "../../generated/prisma/index.js";
import { prisma } from "../../config/prisma.js";

type BankWriteData = {
  key?: string;
  nameKa?: string;
  nameEn?: string;
  nameRu?: string;
  isActive?: boolean;
  supportsInstallment?: boolean;
  supportsSplitPayment?: boolean;
  // Plain JS null, not Prisma's own JsonNull/DbNull — converted below.
  // Prisma.JsonNull would store the JSON literal `null`; Prisma.DbNull
  // (what null here maps to) sets a real SQL NULL, which is what "no
  // credentials configured yet" should mean.
  credentials?: Record<string, string> | null;
};

function toCredentialsInput(credentials: Record<string, string> | null | undefined) {
  if (credentials === undefined) return undefined;
  return credentials === null ? Prisma.DbNull : credentials;
}

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

  async create(data: Required<Omit<BankWriteData, "credentials">> & Pick<BankWriteData, "credentials">) {
    const { _max } = await prisma.bank.aggregate({ _max: { sortOrder: true } });
    return prisma.bank.create({
      data: { ...data, credentials: toCredentialsInput(data.credentials), sortOrder: (_max.sortOrder ?? -1) + 1 },
    });
  },

  update(id: number, data: BankWriteData) {
    return prisma.bank.update({
      where: { id },
      data: { ...data, credentials: toCredentialsInput(data.credentials) },
    });
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

import { prisma } from "../../config/prisma.js";

type TermsWriteData = {
  contentKa?: string;
  contentEn?: string;
  contentRu?: string;
};

export const termsRepository = {
  findFirst() {
    return prisma.termsAndConditions.findFirst({ orderBy: { id: "asc" } });
  },

  create() {
    return prisma.termsAndConditions.create({ data: {} });
  },

  update(id: number, data: TermsWriteData) {
    return prisma.termsAndConditions.update({ where: { id }, data });
  },
};

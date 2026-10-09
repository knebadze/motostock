import { prisma } from "../../config/prisma.js";

type PrivacyPolicyWriteData = {
  contentKa?: string;
  contentEn?: string;
  contentRu?: string;
};

export const privacyPolicyRepository = {
  findFirst() {
    return prisma.privacyPolicy.findFirst({ orderBy: { id: "asc" } });
  },

  create() {
    return prisma.privacyPolicy.create({ data: {} });
  },

  update(id: number, data: PrivacyPolicyWriteData) {
    return prisma.privacyPolicy.update({ where: { id }, data });
  },
};

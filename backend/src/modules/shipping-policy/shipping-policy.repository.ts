import { prisma } from "../../config/prisma.js";

type ShippingPolicyWriteData = {
  contentKa?: string;
  contentEn?: string;
  contentRu?: string;
};

export const shippingPolicyRepository = {
  findFirst() {
    return prisma.shippingPolicy.findFirst({ orderBy: { id: "asc" } });
  },

  create() {
    return prisma.shippingPolicy.create({ data: {} });
  },

  update(id: number, data: ShippingPolicyWriteData) {
    return prisma.shippingPolicy.update({ where: { id }, data });
  },
};

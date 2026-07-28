import { prisma } from "../../config/prisma.js";

export const productVariantImagesRepository = {
  findMany(productVariantId: number) {
    return prisma.productVariantImage.findMany({
      where: { productVariantId },
      orderBy: { position: "asc" },
    });
  },

  findById(id: number) {
    return prisma.productVariantImage.findUnique({ where: { id } });
  },

  maxPosition(productVariantId: number) {
    return prisma.productVariantImage.aggregate({
      where: { productVariantId },
      _max: { position: true },
    });
  },

  createMany(rows: { productVariantId: number; imageUrl: string; position: number }[]) {
    return prisma.productVariantImage.createMany({ data: rows });
  },

  updatePosition(id: number, position: number) {
    return prisma.productVariantImage.update({ where: { id }, data: { position } });
  },

  delete(id: number) {
    return prisma.productVariantImage.delete({ where: { id } });
  },
};

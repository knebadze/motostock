import { prisma } from "../../config/prisma.js";

type DiscountWriteData = {
  productVariantId: number;
  discountPrice: number;
  discountPercent?: number | null;
  startDate: Date;
  endDate: Date;
};

export const productVariantDiscountsRepository = {
  findMany(productVariantId: number) {
    return prisma.productVariantDiscount.findMany({
      where: { productVariantId },
      orderBy: { startDate: "desc" },
    });
  },

  findById(id: number) {
    return prisma.productVariantDiscount.findUnique({ where: { id } });
  },

  create(data: DiscountWriteData) {
    return prisma.productVariantDiscount.create({ data });
  },

  update(id: number, data: Partial<DiscountWriteData>) {
    return prisma.productVariantDiscount.update({ where: { id }, data });
  },

  delete(id: number) {
    return prisma.productVariantDiscount.delete({ where: { id } });
  },
};

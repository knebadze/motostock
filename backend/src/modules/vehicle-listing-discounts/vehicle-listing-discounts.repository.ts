import { prisma } from "../../config/prisma.js";

type DiscountWriteData = {
  vehicleListingId: number;
  discountPrice: number;
  discountPercent?: number | null;
  startDate: Date;
  endDate: Date;
};

export const vehicleListingDiscountsRepository = {
  findMany(vehicleListingId: number) {
    return prisma.vehicleListingDiscount.findMany({
      where: { vehicleListingId },
      orderBy: { startDate: "desc" },
    });
  },

  findById(id: number) {
    return prisma.vehicleListingDiscount.findUnique({ where: { id } });
  },

  create(data: DiscountWriteData) {
    return prisma.vehicleListingDiscount.create({ data });
  },

  update(id: number, data: Partial<DiscountWriteData>) {
    return prisma.vehicleListingDiscount.update({ where: { id }, data });
  },

  delete(id: number) {
    return prisma.vehicleListingDiscount.delete({ where: { id } });
  },
};

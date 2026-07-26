import { prisma } from "../../config/prisma.js";

export const vehicleListingImagesRepository = {
  findMany(vehicleListingId: number) {
    return prisma.vehicleListingImage.findMany({
      where: { vehicleListingId },
      orderBy: { position: "asc" },
    });
  },

  findById(id: number) {
    return prisma.vehicleListingImage.findUnique({ where: { id } });
  },

  maxPosition(vehicleListingId: number) {
    return prisma.vehicleListingImage.aggregate({
      where: { vehicleListingId },
      _max: { position: true },
    });
  },

  createMany(rows: { vehicleListingId: number; imageUrl: string; position: number }[]) {
    return prisma.vehicleListingImage.createMany({ data: rows });
  },

  updatePosition(id: number, position: number) {
    return prisma.vehicleListingImage.update({ where: { id }, data: { position } });
  },

  delete(id: number) {
    return prisma.vehicleListingImage.delete({ where: { id } });
  },
};

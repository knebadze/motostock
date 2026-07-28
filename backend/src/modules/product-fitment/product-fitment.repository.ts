import { prisma } from "../../config/prisma.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

const include = {
  vehicleCatalog: {
    select: {
      id: true,
      variant: true,
      yearFrom: true,
      yearTo: true,
      brand: { select: namedRefSelect },
      model: { select: namedRefSelect },
    },
  },
} as const;

export const productFitmentRepository = {
  findMany(productId: number) {
    return prisma.productFitment.findMany({
      where: { productId },
      include,
      orderBy: { createdAt: "asc" },
    });
  },

  findById(id: number) {
    return prisma.productFitment.findUnique({ where: { id }, include });
  },

  findByProductAndCatalog(productId: number, vehicleCatalogId: number) {
    return prisma.productFitment.findUnique({
      where: { productId_vehicleCatalogId: { productId, vehicleCatalogId } },
    });
  },

  create(data: { productId: number; vehicleCatalogId: number }) {
    return prisma.productFitment.create({ data, include });
  },

  delete(id: number) {
    return prisma.productFitment.delete({ where: { id } });
  },
};

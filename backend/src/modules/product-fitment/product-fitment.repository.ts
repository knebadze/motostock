import { prisma } from "../../config/prisma.js";

const brandModelRefSelect = { id: true, name: true, slug: true } as const;

const include = {
  vehicleCatalog: {
    select: {
      id: true,
      variant: true,
      yearFrom: true,
      yearTo: true,
      brand: { select: brandModelRefSelect },
      model: { select: brandModelRefSelect },
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

  // How many of each candidate product's explicit fitment rows land inside
  // `vehicleCatalogIds` — a cheap, N+1-free ranking signal for "similar
  // products" (more shared vehicles = more similar). Deliberately only
  // counts explicit ProductFitment rows, not ProductFitmentRule matches:
  // it's a soft ranking tiebreak, not the hard compatibility filter (that's
  // buildVehicleCompatibilityWhere, which does account for rules), so the
  // extra cost of resolving rules per candidate isn't worth it here.
  async findOverlapCounts(
    candidateProductIds: number[],
    vehicleCatalogIds: number[],
  ): Promise<Map<number, number>> {
    if (candidateProductIds.length === 0 || vehicleCatalogIds.length === 0) return new Map();

    const grouped = await prisma.productFitment.groupBy({
      by: ["productId"],
      where: { productId: { in: candidateProductIds }, vehicleCatalogId: { in: vehicleCatalogIds } },
      _count: { vehicleCatalogId: true },
    });

    return new Map(grouped.map((row) => [row.productId, row._count.vehicleCatalogId]));
  },
};

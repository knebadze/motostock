import { prisma } from "../../config/prisma.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
const lookupSelect = { id: true, key: true, nameKa: true, nameEn: true, nameRu: true } as const;

const candidateSelect = {
  id: true,
  year: true,
  price: true,
  condition: { select: lookupSelect },
  color: { select: lookupSelect },
  vehicleCatalog: {
    select: {
      variant: true,
      brand: { select: namedRefSelect },
      model: { select: namedRefSelect },
      fuelType: { select: lookupSelect },
      transmissionType: { select: lookupSelect },
      coolingType: { select: lookupSelect },
      finalDriveType: { select: lookupSelect },
      driveType: { select: lookupSelect },
      startType: { select: lookupSelect },
      powertrainType: { select: lookupSelect },
    },
  },
  discounts: { select: { discountPercent: true, startDate: true, endDate: true } },
} as const;

export const bulkVehicleListingDiscountsRepository = {
  findCandidateListings(categoryIds: number[]) {
    return prisma.vehicleListing.findMany({
      where: { vehicleCatalog: { model: { categoryId: { in: categoryIds } } } },
      select: candidateSelect,
      orderBy: { createdAt: "desc" },
    });
  },

  findListingsForDiscount(vehicleListingIds: number[]) {
    return prisma.vehicleListing.findMany({
      where: { id: { in: vehicleListingIds } },
      select: { id: true, price: true },
    });
  },

  async bulkCreateDiscounts(
    rows: { vehicleListingId: number; discountPrice: number; discountPercent: number; startDate: Date; endDate: Date }[],
  ) {
    return prisma.$transaction(rows.map((row) => prisma.vehicleListingDiscount.create({ data: row })));
  },
};

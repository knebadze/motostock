import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

const brandModelRefSelect = { id: true, name: true, slug: true } as const;
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
      brand: { select: brandModelRefSelect },
      model: { select: brandModelRefSelect },
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

const discountHistorySelect = {
  id: true,
  discountPrice: true,
  discountPercent: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  vehicleListing: {
    select: {
      id: true,
      year: true,
      price: true,
      condition: { select: lookupSelect },
      color: { select: lookupSelect },
      vehicleCatalog: {
        select: {
          variant: true,
          brand: { select: brandModelRefSelect },
          model: { select: brandModelRefSelect },
        },
      },
    },
  },
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

  // Every VehicleListingDiscount that exists, regardless of category —
  // powers the discounts-page "history" tab.
  findAllDiscounts(search?: string) {
    const searchWhere: Prisma.VehicleListingWhereInput | undefined = search
      ? {
          OR: [
            { vehicleCatalog: { brand: { name: { contains: search, mode: "insensitive" } } } },
            { vehicleCatalog: { model: { name: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : undefined;

    return prisma.vehicleListingDiscount.findMany({
      where: searchWhere ? { vehicleListing: searchWhere } : undefined,
      select: discountHistorySelect,
      orderBy: { startDate: "desc" },
    });
  },
};

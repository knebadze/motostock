import { prisma } from "../../config/prisma.js";
import { vehicleCatalogInclude } from "../vehicle-catalog/vehicle-catalog.repository.js";

const include = { vehicleCatalog: { include: vehicleCatalogInclude } } as const;

type GarageVehicleWriteData = {
  userId: number;
  vehicleCatalogId: number;
  year: number;
  vin?: string | null;
};

export const garageRepository = {
  findByUserId(userId: number) {
    return prisma.garageVehicle.findMany({
      where: { userId },
      include,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.garageVehicle.findUnique({ where: { id }, include });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.garageVehicle.update({ where: { id }, data: { imageUrl }, include });
  },

  // Bundles the GarageVehicle write with the VehicleCatalog.popularity bump
  // in one transaction — same convention as vehicle-catalog.repository.ts's
  // createSubmission. Two separate top-level calls would let a mid-flight
  // crash/connection drop leave popularity permanently out of sync with
  // the real garage-row count, with no reconciliation job to self-heal it.
  createWithPopularityBump(data: GarageVehicleWriteData) {
    return prisma.$transaction(async (tx) => {
      const row = await tx.garageVehicle.create({ data, include });
      await tx.vehicleCatalog.update({
        where: { id: data.vehicleCatalogId },
        data: { popularity: { increment: 1 } },
      });
      return row;
    });
  },

  // `previousVehicleCatalogId` is only passed when the entry is being
  // re-pointed at a different catalog row — the popularity move (decrement
  // old, increment new) only happens then, still inside the same
  // transaction as the GarageVehicle update itself.
  updateWithPopularityBump(
    id: number,
    data: { vehicleCatalogId: number; year: number; vin?: string | null },
    previousVehicleCatalogId?: number,
  ) {
    return prisma.$transaction(async (tx) => {
      const row = await tx.garageVehicle.update({ where: { id }, data, include });
      if (previousVehicleCatalogId !== undefined) {
        await tx.vehicleCatalog.update({
          where: { id: previousVehicleCatalogId },
          data: { popularity: { decrement: 1 } },
        });
        await tx.vehicleCatalog.update({
          where: { id: data.vehicleCatalogId },
          data: { popularity: { increment: 1 } },
        });
      }
      return row;
    });
  },

  deleteWithPopularityBump(id: number, vehicleCatalogId: number) {
    return prisma.$transaction(async (tx) => {
      await tx.garageVehicle.delete({ where: { id } });
      await tx.vehicleCatalog.update({
        where: { id: vehicleCatalogId },
        data: { popularity: { decrement: 1 } },
      });
    });
  },
};

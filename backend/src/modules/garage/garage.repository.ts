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

  create(data: GarageVehicleWriteData) {
    return prisma.garageVehicle.create({ data, include });
  },

  update(id: number, data: { vehicleCatalogId: number; year: number; vin?: string | null }) {
    return prisma.garageVehicle.update({ where: { id }, data, include });
  },

  delete(id: number) {
    return prisma.garageVehicle.delete({ where: { id } });
  },
};

import { prisma } from "../../config/prisma.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

const include = {
  category: { select: namedRefSelect },
  brand: { select: namedRefSelect },
  model: { select: namedRefSelect },
  fuelType: true,
  transmissionType: true,
  coolingType: true,
  finalDriveType: true,
  driveType: true,
  startType: true,
} as const;

type VehicleCatalogWriteData = {
  categoryId: number;
  brandId: number;
  modelId: number;
  yearFrom?: number | null;
  yearTo?: number | null;
  engineVolumeCc?: number | null;
  enginePowerHp?: number | null;
  cylinderCount?: number | null;
  gearCount?: number | null;
  seatCount?: number | null;
  fuelTypeId?: number | null;
  transmissionTypeId?: number | null;
  coolingTypeId?: number | null;
  finalDriveTypeId?: number | null;
  driveTypeId?: number | null;
  startTypeId?: number | null;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
};

export const vehicleCatalogRepository = {
  findMany() {
    return prisma.vehicleCatalog.findMany({
      include,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.vehicleCatalog.findUnique({ where: { id }, include });
  },

  create(data: VehicleCatalogWriteData) {
    return prisma.vehicleCatalog.create({ data, include });
  },

  update(id: number, data: Partial<VehicleCatalogWriteData>) {
    return prisma.vehicleCatalog.update({ where: { id }, data, include });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.vehicleCatalog.update({ where: { id }, data: { imageUrl }, include });
  },

  delete(id: number) {
    return prisma.vehicleCatalog.delete({ where: { id } });
  },
};

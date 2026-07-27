import { prisma } from "../../config/prisma.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

const include = {
  brand: { select: namedRefSelect },
  model: { select: { ...namedRefSelect, category: { select: namedRefSelect } } },
  fuelType: true,
  transmissionType: true,
  coolingType: true,
  finalDriveType: true,
  driveType: true,
  startType: true,
  powertrainType: true,
} as const;

type VehicleCatalogWriteData = {
  brandId: number;
  modelId: number;
  variant?: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  engineVolumeCc?: number | null;
  enginePowerHp?: number | null;
  cylinderCount?: number | null;
  gearCount?: number | null;
  seatCount?: number | null;
  weightKg?: number | null;
  seatHeightMm?: number | null;
  fuelTankLiters?: number | null;
  topSpeedKmh?: number | null;
  hasAbs?: boolean | null;
  fuelTypeId?: number | null;
  transmissionTypeId?: number | null;
  coolingTypeId?: number | null;
  finalDriveTypeId?: number | null;
  driveTypeId?: number | null;
  startTypeId?: number | null;
  powertrainTypeId?: number | null;
  motorPowerWatt?: number | null;
  batteryCapacityWh?: number | null;
  rangeKm?: number | null;
  chargingTimeMinutes?: number | null;
  hasLockingDifferential?: boolean | null;
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

  findDuplicate(params: {
    modelId: number;
    variant: string;
    yearFrom: number | null;
    yearTo: number | null;
    excludeId?: number;
  }) {
    return prisma.vehicleCatalog.findFirst({
      where: {
        modelId: params.modelId,
        variant: params.variant,
        yearFrom: params.yearFrom,
        yearTo: params.yearTo,
        ...(params.excludeId != null ? { id: { not: params.excludeId } } : {}),
      },
    });
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

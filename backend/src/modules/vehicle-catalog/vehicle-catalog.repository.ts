import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

const submitterSelect = { id: true, firstName: true, lastName: true } as const;

const brandModelRefSelect = { id: true, name: true, slug: true } as const;

export const vehicleCatalogInclude = {
  brand: { select: brandModelRefSelect },
  model: { select: { ...brandModelRefSelect, category: { select: namedRefSelect } } },
  fuelType: true,
  transmissionType: true,
  coolingType: true,
  finalDriveType: true,
  driveType: true,
  startType: true,
  powertrainType: true,
  submittedBy: { select: submitterSelect },
} as const;

const include = vehicleCatalogInclude;

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
  userId?: number | null;
};

export const vehicleCatalogRepository = {
  // skip/take are optional and only passed by the admin catalog list's
  // paginated path — compatibility.service.ts's fitment-matching calls (and
  // any other full-list caller) pass neither, so they keep getting every
  // matching row, same as before.
  findMany(where?: Prisma.VehicleCatalogWhereInput, skip?: number, take?: number) {
    return prisma.vehicleCatalog.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  count(where?: Prisma.VehicleCatalogWhereInput) {
    return prisma.vehicleCatalog.count({ where });
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

  // Self-service submission (garage "couldn't find mine" flow) — creates the
  // catalog row and the submitter's garage entry for it together, so a
  // failure partway through never leaves an orphaned catalog row with no
  // garage link, or vice versa.
  createSubmission(
    catalogData: VehicleCatalogWriteData,
    garageUserId: number,
    year: number,
    vin?: string | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const catalog = await tx.vehicleCatalog.create({
        data: { ...catalogData, popularity: 1 },
        include,
      });
      const garageVehicle = await tx.garageVehicle.create({
        data: { userId: garageUserId, vehicleCatalogId: catalog.id, year, vin: vin ?? null },
      });
      return { catalog, garageVehicle };
    });
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

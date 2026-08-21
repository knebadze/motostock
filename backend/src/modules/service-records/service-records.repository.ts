import { prisma } from "../../config/prisma.js";
import type { Prisma, ServicePosition } from "../../generated/prisma/index.js";

const include = { serviceType: true, mechanic: true } as const;

type ServiceRecordWriteData = {
  garageVehicleId: number;
  serviceTypeId?: number | null;
  customServiceName?: string | null;
  mileageKm: number;
  performedAt: Date;
  position?: ServicePosition | null;
  filterChanged?: boolean | null;
  price?: Prisma.Decimal | number | null;
  mechanicId?: number | null;
  notes?: string | null;
  recordedByUserId?: number | null;
};

export const serviceRecordsRepository = {
  findByGarageVehicleId(garageVehicleId: number) {
    return prisma.serviceRecord.findMany({
      where: { garageVehicleId },
      include,
      orderBy: { performedAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.serviceRecord.findUnique({ where: { id }, include });
  },

  create(data: ServiceRecordWriteData) {
    return prisma.serviceRecord.create({ data, include });
  },

  update(id: number, data: Partial<ServiceRecordWriteData>) {
    return prisma.serviceRecord.update({ where: { id }, data, include });
  },

  delete(id: number) {
    return prisma.serviceRecord.delete({ where: { id } });
  },
};

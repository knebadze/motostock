import { prisma } from "../../config/prisma.js";
import type { Prisma, ServicePosition } from "../../generated/prisma/index.js";
import { vehicleCatalogInclude } from "../vehicle-catalog/vehicle-catalog.repository.js";

const include = { serviceType: true, mechanic: true } as const;

// The admin-wide overview table also needs to show whose vehicle each
// record belongs to and which one it is — the per-vehicle `include` above
// doesn't, since that caller already knows both from having picked the
// vehicle first.
const adminInclude = {
  serviceType: true,
  mechanic: true,
  garageVehicle: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      vehicleCatalog: { include: vehicleCatalogInclude },
    },
  },
} as const;

export type AdminServiceRecordFilters = {
  search?: string;
  serviceTypeId?: number;
  mechanicId?: number;
  performedFrom?: Date;
  performedTo?: Date;
};

function buildAdminWhere(filters: AdminServiceRecordFilters): Prisma.ServiceRecordWhereInput | undefined {
  const and: Prisma.ServiceRecordWhereInput[] = [];

  if (filters.search) {
    and.push({
      OR: [
        { customServiceName: { contains: filters.search, mode: "insensitive" } },
        { garageVehicle: { user: { firstName: { contains: filters.search, mode: "insensitive" } } } },
        { garageVehicle: { user: { lastName: { contains: filters.search, mode: "insensitive" } } } },
      ],
    });
  }
  if (filters.serviceTypeId != null) and.push({ serviceTypeId: filters.serviceTypeId });
  if (filters.mechanicId != null) and.push({ mechanicId: filters.mechanicId });
  if (filters.performedFrom) and.push({ performedAt: { gte: filters.performedFrom } });
  if (filters.performedTo) and.push({ performedAt: { lte: filters.performedTo } });

  return and.length > 0 ? { AND: and } : undefined;
}

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

  // Shared between findManyAdmin and countAdmin so the two never drift
  // apart — same reasoning as users.repository.ts's buildWhere.
  findManyAdmin(filters: AdminServiceRecordFilters, skip: number, take: number) {
    return prisma.serviceRecord.findMany({
      where: buildAdminWhere(filters),
      include: adminInclude,
      orderBy: { performedAt: "desc" },
      skip,
      take,
    });
  },

  countAdmin(filters: AdminServiceRecordFilters) {
    return prisma.serviceRecord.count({ where: buildAdminWhere(filters) });
  },
};

import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";
import { getSpecFieldDefinition } from "../vehicle-category-filters/vehicle-spec-fields.registry.js";
import { applyVehicleListingAdminFilters } from "../filters/vehicle-listing/vehicle-listing-admin-filter-registry.js";
import type { FilterEntry } from "../filters/filter-request.schema.js";
import type { SpecFilterInput } from "./vehicle-listing.schema.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

export const vehicleListingInclude = {
  vehicleCatalog: {
    include: {
      brand: { select: namedRefSelect },
      model: { select: { ...namedRefSelect, category: { select: namedRefSelect } } },
      fuelType: true,
      transmissionType: true,
      coolingType: true,
      finalDriveType: true,
      driveType: true,
      startType: true,
      powertrainType: true,
    },
  },
  condition: true,
  status: true,
  color: true,
  discounts: { orderBy: { startDate: "desc" } },
  images: { orderBy: { position: "asc" } },
} as const;

const include = vehicleListingInclude;

type VehicleListingWriteData = {
  vehicleCatalogId: number;
  conditionId: number;
  statusId: number;
  colorId: number;
  year: number;
  isActive?: boolean;
  price: number;
  stockQuantity?: number;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
};

function buildWhere(filters: {
  categoryIds?: number[];
  search?: string;
  brandIds?: number[];
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  specFilters?: SpecFilterInput;
  adminFilters?: FilterEntry[];
}): Prisma.VehicleListingWhereInput | undefined {
  const and: Prisma.VehicleListingWhereInput[] = [];

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    and.push({ vehicleCatalog: { model: { categoryId: { in: filters.categoryIds } } } });
  }

  if (filters.search) {
    and.push({
      OR: [
        { vehicleCatalog: { brand: { nameKa: { contains: filters.search, mode: "insensitive" } } } },
        { vehicleCatalog: { brand: { nameEn: { contains: filters.search, mode: "insensitive" } } } },
        { vehicleCatalog: { brand: { nameRu: { contains: filters.search, mode: "insensitive" } } } },
        { vehicleCatalog: { model: { nameKa: { contains: filters.search, mode: "insensitive" } } } },
        { vehicleCatalog: { model: { nameEn: { contains: filters.search, mode: "insensitive" } } } },
        { vehicleCatalog: { model: { nameRu: { contains: filters.search, mode: "insensitive" } } } },
      ],
    });
  }

  if (filters.brandIds && filters.brandIds.length > 0) {
    and.push({ vehicleCatalog: { brandId: { in: filters.brandIds } } });
  }

  if (filters.priceMin != null || filters.priceMax != null) {
    and.push({
      price: {
        ...(filters.priceMin != null ? { gte: filters.priceMin } : {}),
        ...(filters.priceMax != null ? { lte: filters.priceMax } : {}),
      },
    });
  }

  if (filters.yearMin != null || filters.yearMax != null) {
    and.push({
      year: {
        ...(filters.yearMin != null ? { gte: filters.yearMin } : {}),
        ...(filters.yearMax != null ? { lte: filters.yearMax } : {}),
      },
    });
  }

  // Spec fields resolve to a dynamic VehicleCatalog column name at runtime
  // (see vehicle-spec-fields.registry.ts) — Prisma's generated WhereInput
  // type can't express "one of these known keys, chosen at runtime", so the
  // constructed clause is cast back to it.
  for (const lookupFilter of filters.specFilters?.lookupFilters ?? []) {
    const { column } = getSpecFieldDefinition(lookupFilter.field);
    and.push({
      vehicleCatalog: { [column]: { in: lookupFilter.ids } } as Prisma.VehicleCatalogWhereInput,
    });
  }

  for (const range of filters.specFilters?.numberRanges ?? []) {
    const { column } = getSpecFieldDefinition(range.field);
    and.push({
      vehicleCatalog: {
        [column]: {
          ...(range.min != null ? { gte: range.min } : {}),
          ...(range.max != null ? { lte: range.max } : {}),
        },
      } as Prisma.VehicleCatalogWhereInput,
    });
  }

  for (const field of filters.specFilters?.booleanFields ?? []) {
    const { column } = getSpecFieldDefinition(field);
    and.push({ vehicleCatalog: { [column]: true } as Prisma.VehicleCatalogWhereInput });
  }

  const adminWhere = applyVehicleListingAdminFilters(filters.adminFilters);
  if (adminWhere) and.push(adminWhere);

  return and.length > 0 ? { AND: and } : undefined;
}

export const vehicleListingRepository = {
  findMany(filters: {
    categoryIds?: number[];
    search?: string;
    brandIds?: number[];
    priceMin?: number;
    priceMax?: number;
    yearMin?: number;
    yearMax?: number;
    specFilters?: SpecFilterInput;
    adminFilters?: FilterEntry[];
  }) {
    return prisma.vehicleListing.findMany({
      where: buildWhere(filters),
      include,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.vehicleListing.findUnique({ where: { id }, include });
  },

  create(data: VehicleListingWriteData) {
    return prisma.vehicleListing.create({ data, include });
  },

  update(id: number, data: Partial<VehicleListingWriteData>) {
    return prisma.vehicleListing.update({ where: { id }, data, include });
  },

  delete(id: number) {
    return prisma.vehicleListing.delete({ where: { id } });
  },
};

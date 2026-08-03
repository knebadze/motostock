import { prisma } from "../../config/prisma.js";
import type {
  VehicleCategoryFilterType,
  VehicleSpecField,
} from "../../generated/prisma/index.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

// `category` here is the row's own defining category — when listing with
// ancestor ids included, this can differ from the category page being
// browsed/managed (an inherited filter), which the UI surfaces explicitly.
const include = {
  category: { select: namedRefSelect },
} as const;

type VehicleCategoryFilterWriteData = {
  categoryId: number;
  filterType: VehicleCategoryFilterType;
  specField?: VehicleSpecField | null;
  sortOrder?: number;
};

export const vehicleCategoryFiltersRepository = {
  // Accepts [categoryId, ...ancestorIds] — a filter configured on a parent
  // category applies to every descendant category page too, same
  // inheritance convention as CategoryFilterConfig.
  findMany(categoryIds: number[]) {
    return prisma.vehicleCategoryFilterConfig.findMany({
      where: { categoryId: { in: categoryIds } },
      include,
      orderBy: { sortOrder: "asc" },
    });
  },

  findById(id: number) {
    return prisma.vehicleCategoryFilterConfig.findUnique({ where: { id }, include });
  },

  findByCategoryAndType(categoryId: number, filterType: VehicleCategoryFilterType) {
    return prisma.vehicleCategoryFilterConfig.findFirst({ where: { categoryId, filterType } });
  },

  findByCategoryAndSpecField(categoryId: number, specField: VehicleSpecField) {
    return prisma.vehicleCategoryFilterConfig.findFirst({ where: { categoryId, specField } });
  },

  create(data: VehicleCategoryFilterWriteData) {
    return prisma.vehicleCategoryFilterConfig.create({ data, include });
  },

  updateSortOrder(id: number, sortOrder: number) {
    return prisma.vehicleCategoryFilterConfig.update({ where: { id }, data: { sortOrder }, include });
  },

  delete(id: number) {
    return prisma.vehicleCategoryFilterConfig.delete({ where: { id } });
  },
};

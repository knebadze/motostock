import { prisma } from "../../config/prisma.js";
import { withNextSortOrderLock } from "../../lib/sortOrder.js";
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

  // categoryIds is [categoryId, ...ancestorIds] — see
  // category-filters.repository.ts's identical findByCategoryAndType for
  // why the duplicate check has to span the whole ancestor chain, not just
  // the exact category being written to.
  findByCategoryAndType(categoryIds: number[], filterType: VehicleCategoryFilterType) {
    return prisma.vehicleCategoryFilterConfig.findFirst({
      where: { categoryId: { in: categoryIds }, filterType },
    });
  },

  findByCategoryAndSpecField(categoryIds: number[], specField: VehicleSpecField) {
    return prisma.vehicleCategoryFilterConfig.findFirst({
      where: { categoryId: { in: categoryIds }, specField },
    });
  },

  // sortOrder is computed here, not accepted from the caller — see
  // category-filters.repository.ts's create for the full rationale (same
  // client-computed-race issue, same fix, same categoryId-scoped lock).
  create(data: VehicleCategoryFilterWriteData) {
    return withNextSortOrderLock(`VehicleCategoryFilterConfig:${data.categoryId}`, async (tx) => {
      const { _max } = await tx.vehicleCategoryFilterConfig.aggregate({
        where: { categoryId: data.categoryId },
        _max: { sortOrder: true },
      });
      return tx.vehicleCategoryFilterConfig.create({
        data: { ...data, sortOrder: (_max.sortOrder ?? -1) + 1 },
        include,
      });
    });
  },

  updateSortOrder(id: number, sortOrder: number) {
    return prisma.vehicleCategoryFilterConfig.update({ where: { id }, data: { sortOrder }, include });
  },

  delete(id: number) {
    return prisma.vehicleCategoryFilterConfig.delete({ where: { id } });
  },
};

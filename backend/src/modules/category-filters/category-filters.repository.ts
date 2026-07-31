import { prisma } from "../../config/prisma.js";
import type { CategoryFilterType } from "../../generated/prisma/index.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

const attributeSelect = {
  id: true,
  nameKa: true,
  nameEn: true,
  nameRu: true,
  valueType: true,
  options: { select: { id: true, key: true, labelKa: true, labelEn: true, labelRu: true } },
} as const;

// `category` here is the row's own defining category — when listing with
// ancestor ids included, this can differ from the category page being
// browsed/managed (an inherited filter), which the UI surfaces explicitly.
const include = {
  category: { select: namedRefSelect },
  attribute: { select: attributeSelect },
} as const;

type CategoryFilterWriteData = {
  categoryId: number;
  filterType: CategoryFilterType;
  attributeId?: number | null;
  sortOrder?: number;
};

export const categoryFiltersRepository = {
  // Accepts [categoryId, ...ancestorIds] — a filter configured on a parent
  // category (e.g. "Material" on "Gear") applies to every descendant
  // category page too, same inheritance convention as Attribute itself.
  findMany(categoryIds: number[]) {
    return prisma.categoryFilterConfig.findMany({
      where: { categoryId: { in: categoryIds } },
      include,
      orderBy: { sortOrder: "asc" },
    });
  },

  findById(id: number) {
    return prisma.categoryFilterConfig.findUnique({ where: { id }, include });
  },

  findByCategoryAndType(categoryId: number, filterType: CategoryFilterType) {
    return prisma.categoryFilterConfig.findFirst({ where: { categoryId, filterType } });
  },

  findByCategoryAndAttribute(categoryId: number, attributeId: number) {
    return prisma.categoryFilterConfig.findFirst({ where: { categoryId, attributeId } });
  },

  create(data: CategoryFilterWriteData) {
    return prisma.categoryFilterConfig.create({ data, include });
  },

  updateSortOrder(id: number, sortOrder: number) {
    return prisma.categoryFilterConfig.update({ where: { id }, data: { sortOrder }, include });
  },

  delete(id: number) {
    return prisma.categoryFilterConfig.delete({ where: { id } });
  },
};

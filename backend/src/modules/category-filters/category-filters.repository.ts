import { prisma } from "../../config/prisma.js";
import { withNextSortOrderLock } from "../../lib/sortOrder.js";
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

  // categoryIds is [categoryId, ...ancestorIds] — a PRICE/BRAND/MY_VEHICLE
  // filter set on a parent already applies to this category via
  // inheritance (see findMany above), so the duplicate check has to look
  // across the whole chain, not just the exact category being written to,
  // or a direct API call could add a redundant duplicate on a descendant
  // that already inherits the same filter from an ancestor (the admin UI
  // happens to prevent this in normal use, but the backend itself didn't).
  findByCategoryAndType(categoryIds: number[], filterType: CategoryFilterType) {
    return prisma.categoryFilterConfig.findFirst({
      where: { categoryId: { in: categoryIds }, filterType },
    });
  },

  findByCategoryAndAttribute(categoryIds: number[], attributeId: number) {
    return prisma.categoryFilterConfig.findFirst({
      where: { categoryId: { in: categoryIds }, attributeId },
    });
  },

  // sortOrder is computed here, not accepted from the caller — the
  // frontend used to compute maxSortOrder+1 from its own client-side state
  // and send it directly, with no server-side aggregation at all (worse
  // than the already-fixed "aggregate then create outside a lock" race
  // elsewhere in this codebase, since here there wasn't even an attempt at
  // one). Two concurrent "add filter" requests for the same category could
  // both send the same computed value. Scoped by categoryId (not the full
  // ancestor chain a category page also displays) — sortByAncestorPriority
  // only ever compares sortOrder between rows sharing the same categoryId,
  // grouping by ancestor depth first, so that's the only scope that
  // actually needs to be race-free.
  create(data: CategoryFilterWriteData) {
    return withNextSortOrderLock(`CategoryFilterConfig:${data.categoryId}`, async (tx) => {
      const { _max } = await tx.categoryFilterConfig.aggregate({
        where: { categoryId: data.categoryId },
        _max: { sortOrder: true },
      });
      return tx.categoryFilterConfig.create({
        data: { ...data, sortOrder: (_max.sortOrder ?? -1) + 1 },
        include,
      });
    });
  },

  updateSortOrder(id: number, sortOrder: number) {
    return prisma.categoryFilterConfig.update({ where: { id }, data: { sortOrder }, include });
  },

  delete(id: number) {
    return prisma.categoryFilterConfig.delete({ where: { id } });
  },
};

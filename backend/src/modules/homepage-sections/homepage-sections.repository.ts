import { prisma } from "../../config/prisma.js";
import type { HomepageSectionType } from "../../generated/prisma/index.js";

type HomepageSectionWriteData = {
  titleKa?: string;
  titleEn?: string;
  titleRu?: string;
  isActive?: boolean;
  sortOrder?: number;
  itemCount?: number;
  // Only meaningful for DISCOUNTED_MIXED/POPULAR_MIXED — null for every
  // other type.
  productItemCount?: number | null;
  vehicleItemCount?: number | null;
};

export const homepageSectionsRepository = {
  // id as a secondary sort key keeps ordering deterministic even if two
  // rows ever end up sharing a sortOrder (nothing enforces uniqueness on
  // it — see moveHomepageSection/swapSortOrder below for why a collision
  // shouldn't normally happen, but this is what stops it from being an
  // unstable, query-to-query-different display order if it ever does).
  findMany(onlyActive?: boolean) {
    return prisma.homepageSection.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
  },

  findById(id: number) {
    return prisma.homepageSection.findUnique({ where: { id } });
  },

  // Swaps two rows' sortOrder in one transaction — used by
  // homepage-sections.service.ts's moveHomepageSection (the admin's
  // move-up/move-down control) so the pair can never be observed (or left,
  // on a mid-request failure) in a state where both hold the same value or
  // neither holds its intended one, the way two independent PATCH requests
  // each updating one row could.
  async swapSortOrder(a: { id: number; sortOrder: number }, b: { id: number; sortOrder: number }) {
    await prisma.$transaction([
      prisma.homepageSection.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
      prisma.homepageSection.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
    ]);
  },

  create(
    data: { type: HomepageSectionType } & Required<
      Omit<HomepageSectionWriteData, "productItemCount" | "vehicleItemCount">
    > &
      Pick<HomepageSectionWriteData, "productItemCount" | "vehicleItemCount">,
  ) {
    return prisma.homepageSection.create({ data });
  },

  update(id: number, data: HomepageSectionWriteData) {
    return prisma.homepageSection.update({ where: { id }, data });
  },
};

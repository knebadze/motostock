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
  findMany(onlyActive?: boolean) {
    return prisma.homepageSection.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });
  },

  findByType(type: HomepageSectionType) {
    return prisma.homepageSection.findUnique({ where: { type } });
  },

  findById(id: number) {
    return prisma.homepageSection.findUnique({ where: { id } });
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

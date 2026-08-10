import { prisma } from "../../config/prisma.js";
import type { HomepageProductSliderType } from "../../generated/prisma/index.js";

type HomepageProductSliderWriteData = {
  titleKa?: string;
  titleEn?: string;
  titleRu?: string;
  isActive?: boolean;
  sortOrder?: number;
  itemCount?: number;
};

export const homepageProductSlidersRepository = {
  findMany(onlyActive?: boolean) {
    return prisma.homepageProductSlider.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });
  },

  findByType(type: HomepageProductSliderType) {
    return prisma.homepageProductSlider.findUnique({ where: { type } });
  },

  findById(id: number) {
    return prisma.homepageProductSlider.findUnique({ where: { id } });
  },

  create(data: { type: HomepageProductSliderType } & Required<HomepageProductSliderWriteData>) {
    return prisma.homepageProductSlider.create({ data });
  },

  update(id: number, data: HomepageProductSliderWriteData) {
    return prisma.homepageProductSlider.update({ where: { id }, data });
  },
};

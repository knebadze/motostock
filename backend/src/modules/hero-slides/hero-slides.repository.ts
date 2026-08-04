import { prisma } from "../../config/prisma.js";
import type {
  HeroSlideTextPosition,
  HeroSlideType,
  HeroSlideVerticalPosition,
} from "../../generated/prisma/index.js";

type HeroSlideWriteData = {
  type?: HeroSlideType;
  titleKa?: string;
  titleEn?: string;
  titleRu?: string;
  subtitleKa?: string | null;
  subtitleEn?: string | null;
  subtitleRu?: string | null;
  buttonLabelKa?: string | null;
  buttonLabelEn?: string | null;
  buttonLabelRu?: string | null;
  buttonLink?: string | null;
  discountCategoryId?: number | null;
  discountProductBrandId?: number | null;
  textPosition?: HeroSlideTextPosition;
  verticalPosition?: HeroSlideVerticalPosition;
  isActive?: boolean;
};

export const heroSlidesRepository = {
  findMany(onlyActive?: boolean) {
    return prisma.heroSlide.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
    });
  },

  findById(id: number) {
    return prisma.heroSlide.findUnique({ where: { id } });
  },

  async create(data: Required<HeroSlideWriteData>) {
    const { _max } = await prisma.heroSlide.aggregate({ _max: { sortOrder: true } });
    return prisma.heroSlide.create({ data: { ...data, sortOrder: (_max.sortOrder ?? -1) + 1 } });
  },

  update(id: number, data: HeroSlideWriteData) {
    return prisma.heroSlide.update({ where: { id }, data });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.heroSlide.update({ where: { id }, data: { imageUrl } });
  },

  async reorder(ids: number[]) {
    await Promise.all(ids.map((id, index) => prisma.heroSlide.update({ where: { id }, data: { sortOrder: index } })));
  },

  delete(id: number) {
    return prisma.heroSlide.delete({ where: { id } });
  },
};

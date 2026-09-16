import { prisma } from "../../config/prisma.js";
import type {
  HeroSlideTextPosition,
  HeroSlideType,
  HeroSlideVerticalPosition,
} from "../../generated/prisma/index.js";
import { withNextSortOrderLock } from "../../lib/sortOrder.js";

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

// Read-only — surfaces which event (if any) a DISCOUNT slide belongs to, for
// buildDiscountLink() on the frontend. Never written from this module: all
// writes to discountBulkEventId happen in bulk-discount-events.service.ts,
// through prisma.heroSlide directly (see that file's own comment for why).
const discountBulkEventInclude = {
  discountBulkEvent: {
    select: { id: true, targetType: true, discountPercent: true, startDate: true, endDate: true },
  },
} as const;

export const heroSlidesRepository = {
  findMany(onlyActive?: boolean) {
    return prisma.heroSlide.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
      include: discountBulkEventInclude,
    });
  },

  findById(id: number) {
    return prisma.heroSlide.findUnique({ where: { id }, include: discountBulkEventInclude });
  },

  create(data: Required<HeroSlideWriteData>) {
    return withNextSortOrderLock("HeroSlide", async (tx) => {
      const { _max } = await tx.heroSlide.aggregate({ _max: { sortOrder: true } });
      return tx.heroSlide.create({
        data: { ...data, sortOrder: (_max.sortOrder ?? -1) + 1 },
        include: discountBulkEventInclude,
      });
    });
  },

  update(id: number, data: HeroSlideWriteData) {
    return prisma.heroSlide.update({ where: { id }, data, include: discountBulkEventInclude });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.heroSlide.update({
      where: { id },
      data: { imageUrl },
      include: discountBulkEventInclude,
    });
  },

  async reorder(ids: number[]) {
    await Promise.all(ids.map((id, index) => prisma.heroSlide.update({ where: { id }, data: { sortOrder: index } })));
  },

  delete(id: number) {
    return prisma.heroSlide.delete({ where: { id } });
  },
};

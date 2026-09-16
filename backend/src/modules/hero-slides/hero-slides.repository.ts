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

// Read-only — surfaces which campaign (bulk-discount event or promo code, if
// either) a DISCOUNT slide belongs to, for buildDiscountLink() and the
// "-X% ..." badge on the frontend. Never written from this module: writes to
// discountBulkEventId/discountPromoCodeId happen in bulk-discount-events.
// service.ts / promo-codes.service.ts, through prisma.heroSlide directly
// (see those files' own comments for why).
const campaignIncludes = {
  discountBulkEvent: {
    select: { id: true, targetType: true, discountPercent: true, startDate: true, endDate: true },
  },
  discountPromoCode: {
    select: {
      id: true,
      code: true,
      domain: true,
      discountPercent: true,
      startDate: true,
      endDate: true,
      // A promo code's scope is never an active-discount-row filter (unlike
      // discountCategoryId/discountProductBrandId on this same slide, which
      // assume /shop?onSale=true — a promo code creates no discount rows at
      // all, so that fallback silently narrowed to whatever *other*
      // discounts happened to be active, not this code's real scope). These
      // are surfaced instead so buildDiscountLink can link straight to the
      // code's actual category (plain, no onSale=true) and the storefront
      // can show the scope as text — see HeroSlider.tsx.
      category: { select: { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } },
      productBrand: { select: { id: true, name: true, slug: true } },
    },
  },
} as const;

export const heroSlidesRepository = {
  findMany(onlyActive?: boolean) {
    return prisma.heroSlide.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { sortOrder: "asc" },
      include: campaignIncludes,
    });
  },

  findById(id: number) {
    return prisma.heroSlide.findUnique({ where: { id }, include: campaignIncludes });
  },

  create(data: Required<HeroSlideWriteData>) {
    return withNextSortOrderLock("HeroSlide", async (tx) => {
      const { _max } = await tx.heroSlide.aggregate({ _max: { sortOrder: true } });
      return tx.heroSlide.create({
        data: { ...data, sortOrder: (_max.sortOrder ?? -1) + 1 },
        include: campaignIncludes,
      });
    });
  },

  update(id: number, data: HeroSlideWriteData) {
    return prisma.heroSlide.update({ where: { id }, data, include: campaignIncludes });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.heroSlide.update({
      where: { id },
      data: { imageUrl },
      include: campaignIncludes,
    });
  },

  async reorder(ids: number[]) {
    await Promise.all(ids.map((id, index) => prisma.heroSlide.update({ where: { id }, data: { sortOrder: index } })));
  },

  delete(id: number) {
    return prisma.heroSlide.delete({ where: { id } });
  },
};

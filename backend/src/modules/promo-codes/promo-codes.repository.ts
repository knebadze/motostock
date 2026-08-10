import { prisma } from "../../config/prisma.js";
import type { Prisma, PromoCodeDomain, VehicleSpecField } from "../../generated/prisma/index.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

const include = {
  category: { select: namedRefSelect },
  productBrand: { select: namedRefSelect },
  attribute: { select: { id: true, nameKa: true, nameEn: true, nameRu: true } },
  attributeOption: { select: { id: true, key: true, labelKa: true, labelEn: true, labelRu: true } },
  brand: { select: namedRefSelect },
  model: { select: namedRefSelect },
} as const;

type PromoCodeWriteData = {
  code: string;
  domain?: PromoCodeDomain;
  categoryId?: number | null;
  productBrandId?: number | null;
  attributeId?: number | null;
  attributeOptionId?: number | null;
  brandId?: number | null;
  modelId?: number | null;
  specField?: VehicleSpecField | null;
  specLookupItemId?: number | null;
  discountPercent?: number;
  usageLimit?: number | null;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
};

export const promoCodesRepository = {
  findMany(filters: { domain: PromoCodeDomain; categoryId?: number; search?: string }) {
    const and: Prisma.PromoCodeWhereInput[] = [{ domain: filters.domain }];
    if (filters.categoryId != null) and.push({ categoryId: filters.categoryId });
    if (filters.search) and.push({ code: { contains: filters.search, mode: "insensitive" } });

    return prisma.promoCode.findMany({
      where: { AND: and },
      include,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.promoCode.findUnique({ where: { id }, include });
  },

  findByCode(code: string) {
    return prisma.promoCode.findUnique({ where: { code } });
  },

  create(data: Required<Pick<PromoCodeWriteData, "code" | "domain" | "discountPercent" | "startDate" | "endDate">> & PromoCodeWriteData) {
    return prisma.promoCode.create({ data, include });
  },

  update(id: number, data: Partial<PromoCodeWriteData>) {
    return prisma.promoCode.update({ where: { id }, data, include });
  },

  delete(id: number) {
    return prisma.promoCode.delete({ where: { id } });
  },

  // Derived from Order.promoCodeId rather than a separate counter column —
  // see promo-code.prisma's usageLimit comment.
  countUsage(promoCodeId: number) {
    return prisma.order.count({ where: { promoCodeId } });
  },

  async hasUserUsed(promoCodeId: number, userId: number) {
    const count = await prisma.order.count({ where: { promoCodeId, userId } });
    return count > 0;
  },
};

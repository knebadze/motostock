import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
const brandModelRefSelect = { id: true, name: true, slug: true } as const;
const productRefSelect = { ...namedRefSelect, category: { select: namedRefSelect } } as const;

const fitmentInclude = {
  product: { select: productRefSelect },
  vehicleCatalog: {
    select: {
      id: true,
      variant: true,
      yearFrom: true,
      yearTo: true,
      brand: { select: brandModelRefSelect },
      model: { select: brandModelRefSelect },
    },
  },
} as const;

const ruleInclude = {
  product: { select: productRefSelect },
  category: { select: namedRefSelect },
} as const;

// Newest first, id as tie-break — the order compatibility.service.ts merges
// the two tables in. `take` = how many of the newest rows a page needs.
export const compatibilityRepository = {
  findNewestFitments(where: Prisma.ProductFitmentWhereInput | undefined, take: number) {
    return prisma.productFitment.findMany({
      where,
      include: fitmentInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
    });
  },

  countFitments(where?: Prisma.ProductFitmentWhereInput) {
    return prisma.productFitment.count({ where });
  },

  findNewestRules(where: Prisma.ProductFitmentRuleWhereInput | undefined, take: number) {
    return prisma.productFitmentRule.findMany({
      where,
      include: ruleInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
    });
  },

  countRules(where?: Prisma.ProductFitmentRuleWhereInput) {
    return prisma.productFitmentRule.count({ where });
  },
};

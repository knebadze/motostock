import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
const productRefSelect = { ...namedRefSelect, category: { select: namedRefSelect } } as const;

const fitmentInclude = {
  product: { select: productRefSelect },
  vehicleCatalog: {
    select: {
      id: true,
      variant: true,
      yearFrom: true,
      yearTo: true,
      brand: { select: namedRefSelect },
      model: { select: namedRefSelect },
    },
  },
} as const;

const ruleInclude = {
  product: { select: productRefSelect },
  category: { select: namedRefSelect },
} as const;

export const compatibilityRepository = {
  findAllFitments(where?: Prisma.ProductFitmentWhereInput) {
    return prisma.productFitment.findMany({ where, include: fitmentInclude, orderBy: { createdAt: "desc" } });
  },

  findAllRules(where?: Prisma.ProductFitmentRuleWhereInput) {
    return prisma.productFitmentRule.findMany({ where, include: ruleInclude, orderBy: { createdAt: "desc" } });
  },
};

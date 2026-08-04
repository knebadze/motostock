import { prisma } from "../../config/prisma.js";
import { productSummaryInclude } from "../products/products.repository.js";

const include = { relatedProduct: { include: productSummaryInclude } } as const;

export const productBuyTogetherRepository = {
  findMany(productId: number) {
    return prisma.productBuyTogether.findMany({
      where: { productId },
      include,
      orderBy: { createdAt: "asc" },
    });
  },

  findById(id: number) {
    return prisma.productBuyTogether.findUnique({ where: { id }, include });
  },

  findByProductAndRelated(productId: number, relatedProductId: number) {
    return prisma.productBuyTogether.findUnique({
      where: { productId_relatedProductId: { productId, relatedProductId } },
    });
  },

  create(data: { productId: number; relatedProductId: number }) {
    return prisma.productBuyTogether.create({ data, include });
  },

  delete(id: number) {
    return prisma.productBuyTogether.delete({ where: { id } });
  },
};

import { prisma } from "../../config/prisma.js";

export const productVariantImagesRepository = {
  findMany(productVariantId: number) {
    return prisma.productVariantImage.findMany({
      where: { productVariantId },
      orderBy: { position: "asc" },
    });
  },

  findById(id: number) {
    return prisma.productVariantImage.findUnique({ where: { id } });
  },

  // Used by products.service.ts's deleteProduct to collect every variant
  // gallery image's URL *before* the DB delete cascades the
  // ProductVariant/ProductVariantImage rows away — products.repository.ts's
  // findById (adminProductSummaryInclude) doesn't carry variant images, so
  // this is a dedicated lookup rather than reusing that include.
  findByProductId(productId: number) {
    return prisma.productVariantImage.findMany({ where: { productVariant: { productId } } });
  },

  maxPosition(productVariantId: number) {
    return prisma.productVariantImage.aggregate({
      where: { productVariantId },
      _max: { position: true },
    });
  },

  createMany(rows: { productVariantId: number; imageUrl: string; position: number }[]) {
    return prisma.productVariantImage.createMany({ data: rows });
  },

  updatePosition(id: number, position: number) {
    return prisma.productVariantImage.update({ where: { id }, data: { position } });
  },

  delete(id: number) {
    return prisma.productVariantImage.delete({ where: { id } });
  },
};

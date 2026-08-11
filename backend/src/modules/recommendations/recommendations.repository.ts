import { prisma } from "../../config/prisma.js";

export const recommendationsRepository = {
  // Category/brand affinity signal from a user's own purchase history.
  // OrderItem only stores productVariantId, so this reaches
  // categoryId/productBrandId through ProductVariant -> Product.
  findOrderAffinity(userId: number) {
    return prisma.orderItem.findMany({
      where: { order: { userId }, itemType: "PRODUCT_VARIANT", productVariantId: { not: null } },
      select: {
        productVariant: {
          select: { product: { select: { categoryId: true, productBrandId: true } } },
        },
      },
    });
  },

  // Weaker affinity signal than a purchase — browsing/saving intent, not a
  // completed sale.
  findWishlistAffinity(userId: number) {
    return prisma.wishlistItem.findMany({
      where: { userId, itemType: "PRODUCT", productId: { not: null } },
      select: { product: { select: { categoryId: true, productBrandId: true } } },
    });
  },

  findGarageVehicleCatalogIds(userId: number) {
    return prisma.garageVehicle.findMany({ where: { userId }, select: { vehicleCatalogId: true } });
  },
};

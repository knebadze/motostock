import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

const parentSelect = { id: true, nameKa: true, nameEn: true, nameRu: true } as const;

type CategoryWriteData = {
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  parentId: number | null;
  sortOrder?: number;
  lowStockBadgeEnabled?: boolean;
  onlinePurchaseEnabled?: boolean;
};

export const categoriesRepository = {
  findMany(where?: Prisma.CategoryWhereInput) {
    return prisma.category.findMany({
      where,
      include: { parent: { select: parentSelect } },
      orderBy: [{ sortOrder: "asc" }, { nameKa: "asc" }],
    });
  },

  findById(id: number) {
    return prisma.category.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } });
  },

  // The whole tree's purchase switches — tiny (one row per category), read
  // fresh on every cart add/checkout so an admin change applies at once.
  findOnlinePurchaseTree() {
    return prisma.category.findMany({ select: { id: true, parentId: true, onlinePurchaseEnabled: true } });
  },

  countChildren(id: number) {
    return prisma.category.count({ where: { parentId: id } });
  },

  create(data: CategoryWriteData) {
    return prisma.category.create({
      data,
      include: { parent: { select: parentSelect } },
    });
  },

  update(id: number, data: Partial<CategoryWriteData>) {
    return prisma.category.update({
      where: { id },
      data,
      include: { parent: { select: parentSelect } },
    });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.category.update({ where: { id }, data: { imageUrl } });
  },

  updateBannerImage(id: number, bannerImageUrl: string) {
    return prisma.category.update({ where: { id }, data: { bannerImageUrl } });
  },

  delete(id: number) {
    return prisma.category.delete({ where: { id } });
  },
};

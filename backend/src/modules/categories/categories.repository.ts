import { prisma } from "../../config/prisma.js";

const parentSelect = { id: true, nameKa: true, nameEn: true, nameRu: true } as const;

type CategoryWriteData = {
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  parentId: number | null;
};

export const categoriesRepository = {
  findMany() {
    return prisma.category.findMany({
      include: { parent: { select: parentSelect } },
      orderBy: { nameKa: "asc" },
    });
  },

  findById(id: number) {
    return prisma.category.findUnique({ where: { id } });
  },

  findBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } });
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

  delete(id: number) {
    return prisma.category.delete({ where: { id } });
  },
};

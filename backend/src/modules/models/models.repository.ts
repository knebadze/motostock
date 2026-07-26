import { prisma } from "../../config/prisma.js";

const brandSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;

type ModelWriteData = {
  brandId: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
};

export const modelsRepository = {
  findMany(brandId?: number) {
    return prisma.model.findMany({
      where: brandId ? { brandId } : undefined,
      include: { brand: { select: brandSelect } },
      orderBy: { nameKa: "asc" },
    });
  },

  findById(id: number) {
    return prisma.model.findUnique({
      where: { id },
      include: { brand: { select: brandSelect } },
    });
  },

  findByBrandAndSlug(brandId: number, slug: string) {
    return prisma.model.findUnique({ where: { brandId_slug: { brandId, slug } } });
  },

  create(data: ModelWriteData) {
    return prisma.model.create({ data, include: { brand: { select: brandSelect } } });
  },

  update(id: number, data: Partial<ModelWriteData>) {
    return prisma.model.update({
      where: { id },
      data,
      include: { brand: { select: brandSelect } },
    });
  },

  delete(id: number) {
    return prisma.model.delete({ where: { id } });
  },
};

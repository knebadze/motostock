import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

const brandSelect = { id: true, name: true, slug: true } as const;
const categorySelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
const modelInclude = {
  brand: { select: brandSelect },
  category: { select: categorySelect },
} as const;

type ModelWriteData = {
  brandId: number;
  categoryId: number;
  name: string;
  slug: string;
};

export const modelsRepository = {
  findMany(where?: Prisma.ModelWhereInput, skip?: number, take?: number) {
    return prisma.model.findMany({
      where,
      include: modelInclude,
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
      skip,
      take,
    });
  },

  count(where?: Prisma.ModelWhereInput) {
    return prisma.model.count({ where });
  },

  findById(id: number) {
    return prisma.model.findUnique({
      where: { id },
      include: modelInclude,
    });
  },

  findByBrandAndSlug(brandId: number, slug: string) {
    return prisma.model.findUnique({ where: { brandId_slug: { brandId, slug } } });
  },

  create(data: ModelWriteData) {
    return prisma.model.create({ data, include: modelInclude });
  },

  update(id: number, data: Partial<ModelWriteData>) {
    return prisma.model.update({
      where: { id },
      data,
      include: modelInclude,
    });
  },

  delete(id: number) {
    return prisma.model.delete({ where: { id } });
  },
};

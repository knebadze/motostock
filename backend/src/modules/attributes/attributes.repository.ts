import { prisma } from "../../config/prisma.js";
import type { AttributeValueType } from "../../generated/prisma/index.js";

const categorySelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
const include = { category: { select: categorySelect } } as const;

type AttributeWriteData = {
  categoryId: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  valueType: AttributeValueType;
  required?: boolean;
};

export const attributesRepository = {
  findMany(categoryIds?: number[]) {
    return prisma.attribute.findMany({
      where: categoryIds ? { categoryId: { in: categoryIds } } : undefined,
      include,
      orderBy: { nameKa: "asc" },
    });
  },

  findById(id: number) {
    return prisma.attribute.findUnique({ where: { id }, include });
  },

  create(data: AttributeWriteData) {
    return prisma.attribute.create({ data, include });
  },

  update(id: number, data: Partial<AttributeWriteData>) {
    return prisma.attribute.update({ where: { id }, data, include });
  },

  delete(id: number) {
    return prisma.attribute.delete({ where: { id } });
  },
};

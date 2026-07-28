import { prisma } from "../../config/prisma.js";

type AttributeOptionWriteData = {
  attributeId: number;
  key: string;
  labelKa: string;
  labelEn: string;
  labelRu: string;
};

export const attributeOptionsRepository = {
  findMany(attributeId: number) {
    return prisma.attributeOption.findMany({
      where: { attributeId },
      orderBy: { labelKa: "asc" },
    });
  },

  findById(id: number) {
    return prisma.attributeOption.findUnique({ where: { id } });
  },

  findByAttributeAndKey(attributeId: number, key: string) {
    return prisma.attributeOption.findUnique({
      where: { attributeId_key: { attributeId, key } },
    });
  },

  create(data: AttributeOptionWriteData) {
    return prisma.attributeOption.create({ data });
  },

  update(id: number, data: Partial<AttributeOptionWriteData>) {
    return prisma.attributeOption.update({ where: { id }, data });
  },

  delete(id: number) {
    return prisma.attributeOption.delete({ where: { id } });
  },
};

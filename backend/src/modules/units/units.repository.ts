import { prisma } from "../../config/prisma.js";

type UnitWriteData = {
  nameKa: string;
  nameEn: string;
  nameRu: string;
  abbreviationKa: string;
  abbreviationEn: string;
  abbreviationRu: string;
};

export const unitsRepository = {
  findMany() {
    return prisma.unit.findMany({ orderBy: { nameKa: "asc" } });
  },

  findById(id: number) {
    return prisma.unit.findUnique({ where: { id } });
  },

  create(data: UnitWriteData) {
    return prisma.unit.create({ data });
  },

  update(id: number, data: Partial<UnitWriteData>) {
    return prisma.unit.update({ where: { id }, data });
  },

  delete(id: number) {
    return prisma.unit.delete({ where: { id } });
  },
};

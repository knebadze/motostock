import { prisma } from "../../config/prisma.js";

const citySelect = {
  id: true,
  key: true,
  nameKa: true,
  nameEn: true,
  nameRu: true,
  isTbilisi: true,
} as const;
export const addressInclude = { city: { select: citySelect } } as const;
const include = addressInclude;

type AddressWriteData = {
  phone: string;
  cityId: number;
  street: string;
  building?: string | null;
  apartment?: string | null;
  postalCode?: string | null;
};

export const addressesRepository = {
  findByUserId(userId: number) {
    return prisma.address.findMany({ where: { userId }, include, orderBy: { createdAt: "desc" } });
  },

  findById(id: number) {
    return prisma.address.findUnique({ where: { id }, include });
  },

  create(userId: number, data: AddressWriteData) {
    return prisma.address.create({ data: { userId, ...data }, include });
  },

  update(id: number, data: AddressWriteData) {
    return prisma.address.update({ where: { id }, data, include });
  },

  delete(id: number) {
    return prisma.address.delete({ where: { id } });
  },
};

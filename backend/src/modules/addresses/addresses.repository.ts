import { prisma } from "../../config/prisma.js";

const citySelect = { id: true, key: true, nameKa: true, nameEn: true, nameRu: true } as const;
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
    return prisma.address.findUnique({ where: { userId }, include });
  },

  upsert(userId: number, data: AddressWriteData) {
    return prisma.address.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include,
    });
  },
};

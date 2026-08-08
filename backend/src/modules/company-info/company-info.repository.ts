import { prisma } from "../../config/prisma.js";
import type { WeekDay } from "../../generated/prisma/index.js";

const citySelect = { id: true, key: true, nameKa: true, nameEn: true, nameRu: true } as const;

const include = {
  city: { select: citySelect },
  workingHours: true,
} as const;

type CompanyInfoWriteData = {
  name?: string;
  cityId?: number | null;
  street?: string | null;
  phone?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type WorkingHourWriteData = {
  dayOfWeek: WeekDay;
  isClosed: boolean;
  openTime?: string | null;
  closeTime?: string | null;
};

export const companyInfoRepository = {
  findFirst() {
    return prisma.companyInfo.findFirst({ include, orderBy: { id: "asc" } });
  },

  create(data: { name: string }) {
    return prisma.companyInfo.create({ data, include });
  },

  update(id: number, data: CompanyInfoWriteData) {
    return prisma.companyInfo.update({ where: { id }, data, include });
  },

  updateLogo(id: number, logoUrl: string) {
    return prisma.companyInfo.update({ where: { id }, data: { logoUrl }, include });
  },

  // 7 rows at most — delete-then-recreate inside a transaction is simpler
  // and safer than diffing per-day upserts for a set this small.
  async replaceWorkingHours(companyInfoId: number, rows: WorkingHourWriteData[]) {
    await prisma.$transaction([
      prisma.companyWorkingHour.deleteMany({ where: { companyInfoId } }),
      prisma.companyWorkingHour.createMany({
        data: rows.map((row) => ({ ...row, companyInfoId })),
      }),
    ]);
  },
};

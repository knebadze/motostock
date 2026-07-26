import { prisma } from "../../config/prisma.js";

export const LOOKUP_TYPES = [
  "fuel-types",
  "transmission-types",
  "cooling-types",
  "final-drive-types",
  "drive-types",
  "start-types",
  "powertrain-types",
  "conditions",
  "listing-statuses",
  "colors",
] as const;

export type LookupType = (typeof LOOKUP_TYPES)[number];

export type LookupRecord = {
  id: number;
  key: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
};

export type LookupWriteInput = {
  key: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
};

export type LookupDelegate = {
  findMany: (args: { orderBy: { nameKa: "asc" } }) => Promise<LookupRecord[]>;
  findUnique: (args: {
    where: { id: number } | { key: string };
  }) => Promise<LookupRecord | null>;
  create: (args: { data: LookupWriteInput }) => Promise<LookupRecord>;
  update: (args: {
    where: { id: number };
    data: Partial<LookupWriteInput>;
  }) => Promise<LookupRecord>;
  delete: (args: { where: { id: number } }) => Promise<LookupRecord>;
};

// All lookup models share the exact same scalar shape (id, key,
// nameKa/En/Ru) but Prisma generates a distinct type per model because of
// their differing relation fields — safe to cast to the shared structural
// type since only the common scalar columns are ever touched here.
function asLookupDelegate(delegate: unknown): LookupDelegate {
  return delegate as LookupDelegate;
}

const registry: Record<LookupType, LookupDelegate> = {
  "fuel-types": asLookupDelegate(prisma.fuelType),
  "transmission-types": asLookupDelegate(prisma.transmissionType),
  "cooling-types": asLookupDelegate(prisma.coolingType),
  "final-drive-types": asLookupDelegate(prisma.finalDriveType),
  "drive-types": asLookupDelegate(prisma.driveType),
  "start-types": asLookupDelegate(prisma.startType),
  "powertrain-types": asLookupDelegate(prisma.powertrainType),
  conditions: asLookupDelegate(prisma.condition),
  "listing-statuses": asLookupDelegate(prisma.listingStatus),
  colors: asLookupDelegate(prisma.color),
};

export function getLookupDelegate(type: LookupType): LookupDelegate {
  return registry[type];
}

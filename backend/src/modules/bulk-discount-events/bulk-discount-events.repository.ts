import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

type DbClient = typeof prisma | Prisma.TransactionClient;

export const bulkDiscountEventsRepository = {
  // `client` defaults to the plain prisma singleton, but the apply flow
  // (bulk-discounts.repository.ts) passes its own `tx` so the event row and
  // every discount row it groups are created in one transaction — same
  // DbClient pattern as settings.repository.ts's upsert.
  create(
    data: {
      nameKa: string;
      nameEn: string;
      nameRu: string;
      descriptionKa: string | null;
      descriptionEn: string | null;
      descriptionRu: string | null;
      targetType: "PRODUCT" | "VEHICLE_LISTING";
      discountPercent: number;
      startDate: Date;
      endDate: Date;
      itemCount: number;
    },
    client: DbClient = prisma,
  ) {
    return client.bulkDiscountEvent.create({ data });
  },

  findById(id: number) {
    return prisma.bulkDiscountEvent.findUnique({ where: { id } });
  },

  // Item ids this event grouped, keyed by which side is populated (a given
  // event only ever targets one type — see BulkDiscountEventTargetType) —
  // used by repeatEvent to re-run the same batch against the same items.
  findWithItemIds(id: number) {
    return prisma.bulkDiscountEvent.findUnique({
      where: { id },
      include: {
        productDiscounts: { select: { productVariantId: true } },
        vehicleDiscounts: { select: { vehicleListingId: true } },
      },
    });
  },

  findMany(where: Prisma.BulkDiscountEventWhereInput | undefined, skip: number, take: number) {
    return prisma.bulkDiscountEvent.findMany({ where, orderBy: { createdAt: "desc" }, skip, take });
  },

  count(where?: Prisma.BulkDiscountEventWhereInput) {
    return prisma.bulkDiscountEvent.count({ where });
  },

  updateImage(id: number, imageUrl: string) {
    return prisma.bulkDiscountEvent.update({ where: { id }, data: { imageUrl } });
  },

  // Metadata-only edit — name/description, same fields the apply flow's own
  // optional `event` sub-object accepts. Deliberately excludes
  // discountPercent/startDate/endDate/targetType/itemCount: those describe
  // the actual discount rows this event grouped, and editing them here
  // would desync the event's own record from what those rows really are —
  // see repeatEvent (bulk-discount-events.service.ts) for the supported way
  // to run the batch again at different dates.
  update(
    id: number,
    data: {
      nameKa: string;
      nameEn: string;
      nameRu: string;
      descriptionKa: string | null;
      descriptionEn: string | null;
      descriptionRu: string | null;
    },
  ) {
    return prisma.bulkDiscountEvent.update({ where: { id }, data });
  },

  delete(id: number) {
    return prisma.bulkDiscountEvent.delete({ where: { id } });
  },
};

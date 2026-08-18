import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";
import { getSpecFieldDefinition } from "../vehicle-category-filters/vehicle-spec-fields.registry.js";
import { applyVehicleListingAdminFilters } from "../filters/vehicle-listing/vehicle-listing-admin-filter-registry.js";
import type { FilterEntry } from "../filters/filter-request.schema.js";
import type { SpecFilterInput } from "./vehicle-listing.schema.js";

const namedRefSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, slug: true } as const;
const brandModelRefSelect = { id: true, name: true, slug: true } as const;
const CANCELLED_KEY = "CANCELLED";

// Same reasoning as products.repository.ts's SEARCH_RESULT_CAP — bounds
// findSearchRankedIds so an overly generic search term can't pull back an
// unbounded number of ranked candidates.
const SEARCH_RESULT_CAP = 500;
function candidatePoolSize(limit: number): number {
  return Math.min(1000, Math.max(limit * 20, 200));
}

export const vehicleListingInclude = {
  vehicleCatalog: {
    include: {
      brand: { select: brandModelRefSelect },
      model: { select: { ...brandModelRefSelect, category: { select: namedRefSelect } } },
      fuelType: true,
      transmissionType: true,
      coolingType: true,
      finalDriveType: true,
      driveType: true,
      startType: true,
      powertrainType: true,
    },
  },
  condition: true,
  status: true,
  color: true,
  discounts: { orderBy: { startDate: "desc" } },
  images: { orderBy: { position: "asc" } },
} as const;

const include = vehicleListingInclude;

type VehicleListingWriteData = {
  vehicleCatalogId: number;
  conditionId: number;
  statusId: number;
  colorId: number;
  year: number;
  mileageKm?: number | null;
  warrantyValue?: number | null;
  warrantyUnit?: "YEAR" | "MONTH" | null;
  isActive?: boolean;
  price: number;
  stockQuantity?: number;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
};

function buildWhere(filters: {
  categoryIds?: number[];
  // Pre-ranked by findSearchRankedIds below (pg_trgm word-similarity) — see
  // products.repository.ts's identical pattern for the full rationale.
  searchIds?: number[];
  brandIds?: number[];
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  onSale?: boolean;
  specFilters?: SpecFilterInput;
  adminFilters?: FilterEntry[];
}): Prisma.VehicleListingWhereInput | undefined {
  const and: Prisma.VehicleListingWhereInput[] = [];

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    and.push({ vehicleCatalog: { model: { categoryId: { in: filters.categoryIds } } } });
  }

  if (filters.searchIds) {
    and.push({ id: { in: filters.searchIds } });
  }

  if (filters.brandIds && filters.brandIds.length > 0) {
    and.push({ vehicleCatalog: { brandId: { in: filters.brandIds } } });
  }

  if (filters.priceMin != null || filters.priceMax != null) {
    and.push({
      price: {
        ...(filters.priceMin != null ? { gte: filters.priceMin } : {}),
        ...(filters.priceMax != null ? { lte: filters.priceMax } : {}),
      },
    });
  }

  if (filters.yearMin != null || filters.yearMax != null) {
    and.push({
      year: {
        ...(filters.yearMin != null ? { gte: filters.yearMin } : {}),
        ...(filters.yearMax != null ? { lte: filters.yearMax } : {}),
      },
    });
  }

  if (filters.onSale) {
    const now = new Date();
    and.push({ discounts: { some: { startDate: { lte: now }, endDate: { gte: now } } } });
  }

  // Spec fields resolve to a dynamic VehicleCatalog column name at runtime
  // (see vehicle-spec-fields.registry.ts) — Prisma's generated WhereInput
  // type can't express "one of these known keys, chosen at runtime", so the
  // constructed clause is cast back to it.
  for (const lookupFilter of filters.specFilters?.lookupFilters ?? []) {
    const { column } = getSpecFieldDefinition(lookupFilter.field);
    and.push({
      vehicleCatalog: { [column]: { in: lookupFilter.ids } } as Prisma.VehicleCatalogWhereInput,
    });
  }

  for (const range of filters.specFilters?.numberRanges ?? []) {
    const { column } = getSpecFieldDefinition(range.field);
    and.push({
      vehicleCatalog: {
        [column]: {
          ...(range.min != null ? { gte: range.min } : {}),
          ...(range.max != null ? { lte: range.max } : {}),
        },
      } as Prisma.VehicleCatalogWhereInput,
    });
  }

  for (const field of filters.specFilters?.booleanFields ?? []) {
    const { column } = getSpecFieldDefinition(field);
    and.push({ vehicleCatalog: { [column]: true } as Prisma.VehicleCatalogWhereInput });
  }

  const adminWhere = applyVehicleListingAdminFilters(filters.adminFilters);
  if (adminWhere) and.push(adminWhere);

  return and.length > 0 ? { AND: and } : undefined;
}

export const vehicleListingRepository = {
  findMany(filters: {
    categoryIds?: number[];
    searchIds?: number[];
    brandIds?: number[];
    priceMin?: number;
    priceMax?: number;
    yearMin?: number;
    yearMax?: number;
    onSale?: boolean;
    specFilters?: SpecFilterInput;
    adminFilters?: FilterEntry[];
    limit?: number;
  }) {
    return prisma.vehicleListing.findMany({
      where: buildWhere(filters),
      include,
      // Most-garaged vehicles first (VehicleCatalog.popularity, kept live by
      // the garage module), createdAt as the tiebreaker for equally popular
      // (including brand-new, popularity 0) entries.
      orderBy: [{ vehicleCatalog: { popularity: "desc" } }, { createdAt: "desc" }],
      // When search is active, truncating here would defeat the relevance
      // ranking findSearchRankedIds already computed — see
      // products.repository.ts's identical findMany comment.
      take: filters.searchIds ? undefined : filters.limit,
    });
  },

  // Typo-tolerant, relevance-ranked search across brand/model name — see
  // products.repository.ts's findSearchRankedIds for the full pg_trgm
  // word_similarity rationale (identical reasoning, applied here to the
  // Brand/Model tables the listing joins through instead of Product's own
  // name columns).
  async findSearchRankedIds(search: string, limit?: number): Promise<number[]> {
    const cap = limit != null ? candidatePoolSize(limit) : SEARCH_RESULT_CAP;
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT vl.id
      FROM "dbo"."VehicleListing" vl
      JOIN "dbo"."VehicleCatalog" vc ON vc.id = vl."vehicleCatalogId"
      JOIN "cla"."Brand" b ON b.id = vc."brandId"
      JOIN "cla"."Model" m ON m.id = vc."modelId"
      WHERE b.name %> ${search} OR m.name %> ${search}
      ORDER BY
        GREATEST(word_similarity(${search}, b.name), word_similarity(${search}, m.name)) DESC,
        -- Tiebreaker for ties at the max score — see products.repository.ts's
        -- identical findSearchRankedIds comment for why this is needed.
        LENGTH(b.name) + LENGTH(m.name) ASC
      LIMIT ${cap}
    `;
    return rows.map((row) => row.id);
  },

  findByIds(ids: number[]) {
    return prisma.vehicleListing.findMany({ where: { id: { in: ids } }, include });
  },

  // Ranks listings by total sold quantity (OrderItem.quantity, grouped by
  // vehicleListingId directly — unlike products there's no variant
  // indirection, so unlike products.repository.ts's findPopularProductIds
  // this needs no JS-side rollup: the DB can sort and limit directly) —
  // powers the homepage "popular vehicles" slider. Returns just the ordered
  // id list; callers fetch full rows via findByIds and must re-apply this
  // order themselves (findByIds/`in` queries don't).
  async findPopularListingIds(limit: number): Promise<number[]> {
    const grouped = await prisma.orderItem.groupBy({
      by: ["vehicleListingId"],
      where: { vehicleListingId: { not: null }, order: { status: { key: { not: CANCELLED_KEY } } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });
    return grouped.map((group) => group.vehicleListingId as number);
  },

  findById(id: number) {
    return prisma.vehicleListing.findUnique({ where: { id }, include });
  },

  // Global counter bump — see getVehicleListing in vehicle-listing.service.ts.
  // Independent of the per-visitor VehicleListingView tracking (see
  // vehicle-listing-views module), same split as Product.viewCount.
  incrementViewCount(id: number) {
    return prisma.vehicleListing.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  },

  // Sales history for the admin detail modal — same shape as
  // products.repository.ts's findSalesSummary, but simpler: OrderItem
  // already has a direct vehicleListingId (no variant indirection needed).
  async findSalesSummary(listingId: number) {
    const where = { vehicleListingId: listingId };
    const [totals, distinctOrders, recentItems] = await Promise.all([
      prisma.orderItem.aggregate({ where, _sum: { quantity: true, lineTotal: true } }),
      prisma.orderItem.findMany({ where, select: { orderId: true }, distinct: ["orderId"] }),
      prisma.orderItem.findMany({
        where,
        select: {
          quantity: true,
          lineTotal: true,
          order: {
            select: {
              id: true,
              orderCode: true,
              createdAt: true,
              status: { select: { nameKa: true } },
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return {
      totalQuantitySold: totals._sum.quantity ?? 0,
      totalRevenue: Number(totals._sum.lineTotal ?? 0),
      orderCount: distinctOrders.length,
      recentOrders: recentItems.map((item) => ({
        orderId: item.order.id,
        orderCode: item.order.orderCode,
        createdAt: item.order.createdAt,
        buyerName: `${item.order.user.firstName} ${item.order.user.lastName}`.trim(),
        buyerEmail: item.order.user.email,
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal),
        status: item.order.status.nameKa,
      })),
    };
  },

  create(data: VehicleListingWriteData) {
    return prisma.vehicleListing.create({ data, include });
  },

  update(id: number, data: Partial<VehicleListingWriteData>) {
    return prisma.vehicleListing.update({ where: { id }, data, include });
  },

  delete(id: number) {
    return prisma.vehicleListing.delete({ where: { id } });
  },
};

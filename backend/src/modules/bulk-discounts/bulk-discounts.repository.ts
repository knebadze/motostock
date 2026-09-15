import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";

type DbClient = typeof prisma | Prisma.TransactionClient;

const brandModelRefSelect = { id: true, name: true, slug: true } as const;
const lookupSelect = { id: true, key: true, nameKa: true, nameEn: true, nameRu: true } as const;
const attributeSelect = { id: true, nameKa: true, nameEn: true, nameRu: true, valueType: true } as const;
const optionSelect = { id: true, key: true, labelKa: true, labelEn: true, labelRu: true } as const;

// ---- PRODUCT ----

const productCandidateSelect = {
  id: true,
  nameKa: true,
  nameEn: true,
  nameRu: true,
  slug: true,
  productBrand: { select: brandModelRefSelect },
  attributeValues: {
    include: {
      attribute: { select: attributeSelect },
      option: { select: optionSelect },
    },
  },
  variants: {
    select: {
      id: true,
      sku: true,
      price: true,
      size: { select: lookupSelect },
      color: { select: lookupSelect },
      // orderBy desc matches every other discounts query in the codebase
      // (products.repository.ts, product-variants.repository.ts, ...) — a
      // variant with overlapping active discount rows must resolve to the
      // same "active" one (findActiveDiscount, lib/discounts.ts, takes the
      // first match) here as it does on the storefront card/detail pages,
      // or this admin candidate preview would show a different current
      // discount than what customers actually see.
      discounts: { select: { discountPercent: true, startDate: true, endDate: true }, orderBy: { startDate: "desc" } },
    },
  },
} as const;

const productDiscountHistorySelect = {
  id: true,
  discountPrice: true,
  discountPercent: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  productVariant: {
    select: {
      id: true,
      sku: true,
      price: true,
      size: { select: lookupSelect },
      color: { select: lookupSelect },
      product: {
        select: {
          id: true,
          nameKa: true,
          nameEn: true,
          nameRu: true,
          slug: true,
          productBrand: { select: brandModelRefSelect },
        },
      },
    },
  },
} as const;

function productDiscountSearchWhere(search?: string) {
  return search
    ? {
        productVariant: {
          product: {
            OR: [
              { nameKa: { contains: search, mode: "insensitive" as const } },
              { nameEn: { contains: search, mode: "insensitive" as const } },
              { nameRu: { contains: search, mode: "insensitive" as const } },
            ],
          },
        },
      }
    : undefined;
}

// ---- VEHICLE_LISTING ----

const vehicleCandidateSelect = {
  id: true,
  year: true,
  price: true,
  condition: { select: lookupSelect },
  color: { select: lookupSelect },
  vehicleCatalog: {
    select: {
      variant: true,
      brand: { select: brandModelRefSelect },
      model: { select: brandModelRefSelect },
      fuelType: { select: lookupSelect },
      transmissionType: { select: lookupSelect },
      coolingType: { select: lookupSelect },
      finalDriveType: { select: lookupSelect },
      driveType: { select: lookupSelect },
      startType: { select: lookupSelect },
      powertrainType: { select: lookupSelect },
    },
  },
  // orderBy desc matches every other discounts query in the codebase
  // (vehicle-listing.repository.ts, ...) — a listing with overlapping
  // active discount rows must resolve to the same "active" one
  // (findActiveDiscount, lib/discounts.ts, takes the first match) here as
  // it does on the storefront card/detail pages, or this admin candidate
  // preview would show a different current discount than customers see.
  discounts: { select: { discountPercent: true, startDate: true, endDate: true }, orderBy: { startDate: "desc" } },
} as const;

const vehicleDiscountHistorySelect = {
  id: true,
  discountPrice: true,
  discountPercent: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  vehicleListing: {
    select: {
      id: true,
      year: true,
      price: true,
      condition: { select: lookupSelect },
      color: { select: lookupSelect },
      vehicleCatalog: {
        select: {
          variant: true,
          brand: { select: brandModelRefSelect },
          model: { select: brandModelRefSelect },
        },
      },
    },
  },
} as const;

function vehicleDiscountSearchWhere(search?: string) {
  const searchWhere: Prisma.VehicleListingWhereInput | undefined = search
    ? {
        OR: [
          { vehicleCatalog: { brand: { name: { contains: search, mode: "insensitive" } } } },
          { vehicleCatalog: { model: { name: { contains: search, mode: "insensitive" } } } },
        ],
      }
    : undefined;
  return searchWhere ? { vehicleListing: searchWhere } : undefined;
}

// One repository for both target types — the fields/queries genuinely
// differ (Product/ProductVariant vs VehicleListing/VehicleCatalog), so each
// keeps its own select/where and its own named methods below rather than a
// forced shared shape; only the file (and the transaction-client plumbing)
// is shared, per the admin's request to stop duplicating the whole module
// per target type.
export const bulkDiscountsRepository = {
  findCandidateProducts(categoryIds: number[]) {
    return prisma.product.findMany({
      where: { categoryId: { in: categoryIds } },
      select: productCandidateSelect,
      orderBy: { nameKa: "asc" },
    });
  },

  findVariantsForDiscount(variantIds: number[]) {
    return prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, price: true },
    });
  },

  // `client` defaults to the plain prisma singleton (an ungrouped bulk apply
  // — no event — is unaffected), but applyBulkDiscounts passes its own `tx`
  // when an event is being created too, so the event row and every discount
  // row it groups commit or roll back together — same DbClient pattern as
  // settings.repository.ts's upsert.
  createProductDiscount(
    row: {
      productVariantId: number;
      discountPrice: number;
      discountPercent: number;
      startDate: Date;
      endDate: Date;
      bulkDiscountEventId: number | null;
    },
    client: DbClient = prisma,
  ) {
    return client.productVariantDiscount.create({ data: row });
  },

  // Every ProductVariantDiscount that exists, regardless of category —
  // powers the discounts-page "history" tab, not scoped to a bulk-selection
  // session the way findCandidateProducts above is. Capped at
  // DISCOUNT_HISTORY_MAX_ROWS (see bulk-discounts.service.ts) since the
  // product/vehicle history merges into one client-side-combined admin
  // table, which makes true server-side pagination of that combined result
  // disproportionately complex for what this history view actually needs.
  findAllProductDiscounts(search: string | undefined, take: number) {
    return prisma.productVariantDiscount.findMany({
      where: productDiscountSearchWhere(search),
      select: productDiscountHistorySelect,
      orderBy: { startDate: "desc" },
      take,
    });
  },

  countAllProductDiscounts(search?: string) {
    return prisma.productVariantDiscount.count({ where: productDiscountSearchWhere(search) });
  },

  findCandidateVehicleListings(categoryIds: number[]) {
    return prisma.vehicleListing.findMany({
      where: { vehicleCatalog: { model: { categoryId: { in: categoryIds } } } },
      select: vehicleCandidateSelect,
      orderBy: { createdAt: "desc" },
    });
  },

  findListingsForDiscount(vehicleListingIds: number[]) {
    return prisma.vehicleListing.findMany({
      where: { id: { in: vehicleListingIds } },
      select: { id: true, price: true },
    });
  },

  createVehicleDiscount(
    row: {
      vehicleListingId: number;
      discountPrice: number;
      discountPercent: number;
      startDate: Date;
      endDate: Date;
      bulkDiscountEventId: number | null;
    },
    client: DbClient = prisma,
  ) {
    return client.vehicleListingDiscount.create({ data: row });
  },

  findAllVehicleDiscounts(search: string | undefined, take: number) {
    return prisma.vehicleListingDiscount.findMany({
      where: vehicleDiscountSearchWhere(search),
      select: vehicleDiscountHistorySelect,
      orderBy: { startDate: "desc" },
      take,
    });
  },

  countAllVehicleDiscounts(search?: string) {
    return prisma.vehicleListingDiscount.count({ where: vehicleDiscountSearchWhere(search) });
  },
};

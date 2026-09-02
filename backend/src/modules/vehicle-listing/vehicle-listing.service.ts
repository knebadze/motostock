import { ApiError } from "../../lib/ApiError.js";
import { cache } from "../../lib/cache.js";
import { findActiveDiscount } from "../../lib/discounts.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { resolveCategoryAndDescendantIds } from "../categories/categories.service.js";
import { vehicleCatalogRepository } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getHomepageCacheTtlMinutes } from "../settings/settings.service.js";
import {
  toDiscountResponse,
  type DiscountRow,
} from "../vehicle-listing-discounts/vehicle-listing-discounts.service.js";
import { toImageResponse } from "../vehicle-listing-images/vehicle-listing-images.service.js";
import { vehicleListingRepository } from "./vehicle-listing.repository.js";
import type {
  CreateVehicleListingInput,
  UpdateVehicleListingInput,
  VehicleListingListQuery,
} from "./vehicle-listing.schema.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type BrandModelRefRow = { id: number; name: string; slug: string };
type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };
type ImageRow = { id: number; imageUrl: string; position: number };

type VehicleListingRow = {
  id: number;
  vehicleCatalog: {
    id: number;
    brand: BrandModelRefRow;
    model: BrandModelRefRow & { category: NamedRefRow };
    variant: string;
    yearFrom: number | null;
    yearTo: number | null;
    engineVolumeCc: number | null;
    enginePowerHp: number | null;
    cylinderCount: number | null;
    gearCount: number | null;
    seatCount: number | null;
    weightKg: number | null;
    seatHeightMm: number | null;
    fuelTankLiters: { toString(): string } | null;
    topSpeedKmh: number | null;
    hasAbs: boolean | null;
    fuelType: LookupRow | null;
    transmissionType: LookupRow | null;
    coolingType: LookupRow | null;
    finalDriveType: LookupRow | null;
    driveType: LookupRow | null;
    startType: LookupRow | null;
    powertrainType: LookupRow | null;
    motorPowerWatt: number | null;
    batteryCapacityWh: number | null;
    rangeKm: number | null;
    chargingTimeMinutes: number | null;
    hasLockingDifferential: boolean | null;
    descriptionKa: string | null;
    descriptionEn: string | null;
    descriptionRu: string | null;
    imageUrl: string | null;
  };
  condition: LookupRow;
  status: LookupRow;
  color: LookupRow;
  year: number;
  mileageKm: number | null;
  warrantyValue: number | null;
  warrantyUnit: "YEAR" | "MONTH" | null;
  isActive: boolean;
  price: { toString(): string };
  stockQuantity: number;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  images: ImageRow[];
  discounts: DiscountRow[];
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

export function toVehicleListingResponse(row: VehicleListingRow) {
  const activeDiscount = findActiveDiscount(row.discounts);

  return {
    id: row.id,
    vehicleCatalog: {
      id: row.vehicleCatalog.id,
      category: toNamedRef(row.vehicleCatalog.model.category),
      brand: { id: row.vehicleCatalog.brand.id, name: row.vehicleCatalog.brand.name, slug: row.vehicleCatalog.brand.slug },
      model: { id: row.vehicleCatalog.model.id, name: row.vehicleCatalog.model.name, slug: row.vehicleCatalog.model.slug },
      variant: row.vehicleCatalog.variant,
      yearFrom: row.vehicleCatalog.yearFrom,
      yearTo: row.vehicleCatalog.yearTo,
      engineVolumeCc: row.vehicleCatalog.engineVolumeCc,
      enginePowerHp: row.vehicleCatalog.enginePowerHp,
      cylinderCount: row.vehicleCatalog.cylinderCount,
      gearCount: row.vehicleCatalog.gearCount,
      seatCount: row.vehicleCatalog.seatCount,
      weightKg: row.vehicleCatalog.weightKg,
      seatHeightMm: row.vehicleCatalog.seatHeightMm,
      fuelTankLiters:
        row.vehicleCatalog.fuelTankLiters != null ? Number(row.vehicleCatalog.fuelTankLiters) : null,
      topSpeedKmh: row.vehicleCatalog.topSpeedKmh,
      hasAbs: row.vehicleCatalog.hasAbs,
      fuelType: row.vehicleCatalog.fuelType,
      transmissionType: row.vehicleCatalog.transmissionType,
      coolingType: row.vehicleCatalog.coolingType,
      finalDriveType: row.vehicleCatalog.finalDriveType,
      driveType: row.vehicleCatalog.driveType,
      startType: row.vehicleCatalog.startType,
      powertrainType: row.vehicleCatalog.powertrainType,
      motorPowerWatt: row.vehicleCatalog.motorPowerWatt,
      batteryCapacityWh: row.vehicleCatalog.batteryCapacityWh,
      rangeKm: row.vehicleCatalog.rangeKm,
      chargingTimeMinutes: row.vehicleCatalog.chargingTimeMinutes,
      hasLockingDifferential: row.vehicleCatalog.hasLockingDifferential,
      descriptionKa: row.vehicleCatalog.descriptionKa,
      descriptionEn: row.vehicleCatalog.descriptionEn,
      descriptionRu: row.vehicleCatalog.descriptionRu,
      imageUrl: row.vehicleCatalog.imageUrl,
    },
    condition: row.condition,
    status: row.status,
    color: row.color,
    year: row.year,
    mileageKm: row.mileageKm,
    warrantyValue: row.warrantyValue,
    warrantyUnit: row.warrantyUnit,
    isActive: row.isActive,
    price: Number(row.price),
    stockQuantity: row.stockQuantity,
    descriptionKa: row.descriptionKa,
    descriptionEn: row.descriptionEn,
    descriptionRu: row.descriptionRu,
    images: row.images.map(toImageResponse),
    discounts: row.discounts.map(toDiscountResponse),
    activeDiscount: activeDiscount ? { discountPrice: Number(activeDiscount.discountPrice) } : null,
    viewCount: row.viewCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function formatYearRange(yearFrom: number | null, yearTo: number | null) {
  if (yearFrom != null && yearTo != null) return `${yearFrom}–${yearTo}`;
  if (yearFrom != null) return `${yearFrom}+`;
  return `≤${yearTo}`;
}

async function assertRefsExist(input: {
  vehicleCatalogId: number;
  conditionId: number;
  statusId: number;
  colorId: number;
  year: number;
}) {
  const catalogEntry = await vehicleCatalogRepository.findById(input.vehicleCatalogId);
  if (!catalogEntry) {
    throw new ApiError(400, "მითითებული ტექნიკის კატალოგის ჩანაწერი არ არსებობს");
  }

  const outOfRange =
    (catalogEntry.yearFrom != null && input.year < catalogEntry.yearFrom) ||
    (catalogEntry.yearTo != null && input.year > catalogEntry.yearTo);
  if (outOfRange) {
    throw new ApiError(
      400,
      `წელი (${input.year}) არ ჯდება კატალოგის ჩანაწერის დასაშვებ დიაპაზონში (${formatYearRange(catalogEntry.yearFrom, catalogEntry.yearTo)})`,
    );
  }

  const condition = await lookupsRepository.findById(
    getLookupDelegate("conditions"),
    input.conditionId,
  );
  if (!condition) {
    throw new ApiError(400, "მითითებული მდგომარეობა არ არსებობს");
  }

  const status = await lookupsRepository.findById(
    getLookupDelegate("listing-statuses"),
    input.statusId,
  );
  if (!status) {
    throw new ApiError(400, "მითითებული სტატუსი არ არსებობს");
  }

  const color = await lookupsRepository.findById(getLookupDelegate("colors"), input.colorId);
  if (!color) {
    throw new ApiError(400, "მითითებული ფერი არ არსებობს");
  }
}

// Same reasoning and TTL as products.service.ts's listProducts/
// listPopularProducts — the homepage's on-sale/popular vehicle sliders hit
// these with an identical query shape on essentially every guest visit.

function isCacheableOnSaleQuery(query: VehicleListingListQuery): boolean {
  return (
    query.onSale === true &&
    query.categoryId == null &&
    query.search == null &&
    query.brandIds == null &&
    query.priceMin == null &&
    query.priceMax == null &&
    query.yearMin == null &&
    query.yearMax == null &&
    query.specFilters == null &&
    query.adminFilters == null
  );
}

export async function listVehicleListings(query: VehicleListingListQuery) {
  const cacheKey = isCacheableOnSaleQuery(query)
    ? `vehicleListings:onSale:${query.limit ?? "all"}`
    : null;
  if (cacheKey) {
    const cached = cache.get<ReturnType<typeof toVehicleListingResponse>[]>(cacheKey);
    if (cached) return cached;
  }

  const categoryIds =
    query.categoryId != null ? await resolveCategoryAndDescendantIds(query.categoryId) : undefined;
  const searchIds =
    query.search != null
      ? await vehicleListingRepository.findSearchRankedIds(query.search, query.limit)
      : undefined;

  // The admin panel (AdminFilterPanel, which always sends adminFilters)
  // fetches the whole filtered result set with no limit and paginates
  // client-side — see vehicleListingRepository.findManyForAdmin's comment
  // for why that path drops the 7 VehicleCatalog spec-lookup joins and caps
  // images/discounts instead of using the storefront's full include. The 7
  // dropped lookups are null-filled right after the fetch purely to satisfy
  // toVehicleListingResponse's shape — nothing reads them off an admin-list
  // row (VehicleListingsManager.tsx's table never renders engine specs; the
  // admin detail view fetches full per-listing data separately).
  const isAdminList = query.adminFilters != null;

  const rows = isAdminList
    ? (
        await vehicleListingRepository.findManyForAdmin({
          categoryIds,
          brandIds: query.brandIds,
          priceMin: query.priceMin,
          priceMax: query.priceMax,
          yearMin: query.yearMin,
          yearMax: query.yearMax,
          onSale: query.onSale,
          specFilters: query.specFilters,
          adminFilters: query.adminFilters,
        })
      ).map((row) => ({
        ...row,
        vehicleCatalog: {
          ...row.vehicleCatalog,
          fuelType: null,
          transmissionType: null,
          coolingType: null,
          finalDriveType: null,
          driveType: null,
          startType: null,
          powertrainType: null,
        },
      }))
    : await vehicleListingRepository.findMany({
        categoryIds,
        searchIds,
        brandIds: query.brandIds,
        priceMin: query.priceMin,
        priceMax: query.priceMax,
        yearMin: query.yearMin,
        yearMax: query.yearMax,
        onSale: query.onSale,
        specFilters: query.specFilters,
        adminFilters: query.adminFilters,
        limit: query.limit,
      });

  let result: ReturnType<typeof toVehicleListingResponse>[];
  if (searchIds == null) {
    result = rows.map(toVehicleListingResponse);
  } else {
    // See products.service.ts's listProducts for why this re-sort/slice
    // step is needed (findMany's `id: {in: [...]}` doesn't preserve rank
    // order).
    const rankById = new Map(searchIds.map((id, index) => [id, index]));
    const ranked = [...rows].sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0));
    result = (query.limit != null ? ranked.slice(0, query.limit) : ranked).map(
      toVehicleListingResponse,
    );
  }

  if (cacheKey) cache.set(cacheKey, result, (await getHomepageCacheTtlMinutes()) * 60_000);
  return result;
}

// Homepage "popular vehicles" slider — see
// vehicleListingRepository.findPopularListingIds for the ranking logic;
// this just re-fetches full rows for the ranked ids and preserves their
// order (findByIds/`in` queries don't). Cached the same way and for the
// same reason as listVehicleListings' on-sale path above.
export async function listPopularVehicleListings(limit: number) {
  const cacheKey = `vehicleListings:popular:${limit}`;
  const cached = cache.get<ReturnType<typeof toVehicleListingResponse>[]>(cacheKey);
  if (cached) return cached;

  const rankedIds = await vehicleListingRepository.findPopularListingIds(limit);
  if (rankedIds.length === 0) return [];

  const rows = await vehicleListingRepository.findByIds(rankedIds);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const result = rankedIds
    .map((id) => rowById.get(id))
    .filter((row): row is NonNullable<typeof row> => row != null)
    .map((row) => toVehicleListingResponse(row));

  cache.set(cacheKey, result, (await getHomepageCacheTtlMinutes()) * 60_000);
  return result;
}

// The only caller of this is the guest listing-detail page (see
// vehicle-listings.ts's getVehicleListingFromServer) — admin editing reads
// from the already-loaded table row instead of re-fetching by id, so it's
// safe to always count this as a real view.
export async function getVehicleListing(id: number) {
  const row = await vehicleListingRepository.findById(id);
  // Deactivated listings 404 the same as a genuinely nonexistent id — an
  // admin pulling a listing from sale must make it unreachable here too,
  // not just absent from browsing/search (findMany above).
  if (!row || !row.isActive) {
    throw new ApiError(404, "განცხადება ვერ მოიძებნა", "VEHICLE_LISTING_NOT_FOUND");
  }
  await vehicleListingRepository.incrementViewCount(id);
  return toVehicleListingResponse(row);
}

// Admin "full view" counterpart to getVehicleListing — adds sales history,
// same reasoning as products.service.ts's getProductDetailAdmin.
export async function getVehicleListingDetailAdmin(id: number) {
  const row = await vehicleListingRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "განცხადება ვერ მოიძებნა", "VEHICLE_LISTING_NOT_FOUND");
  }

  const sales = await vehicleListingRepository.findSalesSummary(id);
  return { ...toVehicleListingResponse(row), sales };
}

export async function createVehicleListing(input: CreateVehicleListingInput) {
  await assertRefsExist(input);

  const row = await vehicleListingRepository.create(input);
  return toVehicleListingResponse(row);
}

export async function updateVehicleListing(id: number, input: UpdateVehicleListingInput) {
  const existing = await vehicleListingRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "განცხადება ვერ მოიძებნა");
  }

  await assertRefsExist({
    vehicleCatalogId: input.vehicleCatalogId ?? existing.vehicleCatalog.id,
    conditionId: input.conditionId ?? existing.condition.id,
    statusId: input.statusId ?? existing.status.id,
    colorId: input.colorId ?? existing.color.id,
    year: input.year ?? existing.year,
  });

  const row = await vehicleListingRepository.update(id, input);
  return toVehicleListingResponse(row);
}

export async function deleteVehicleListing(id: number) {
  const existing = await vehicleListingRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "განცხადება ვერ მოიძებნა");
  }

  try {
    await vehicleListingRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(400, "ეს ჩანაწერი გამოიყენება სხვა ჩანაწერებში, ვერ წაიშლება");
    }
    throw error;
  }
}

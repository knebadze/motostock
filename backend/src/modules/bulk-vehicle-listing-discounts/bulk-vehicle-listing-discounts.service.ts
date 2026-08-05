import { ApiError } from "../../lib/ApiError.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { resolveCategoryAndDescendantIds } from "../categories/categories.service.js";
import { VEHICLE_SPEC_FIELDS } from "../vehicle-category-filters/vehicle-spec-fields.registry.js";
import {
  toDiscountResponse,
  type DiscountRow,
} from "../vehicle-listing-discounts/vehicle-listing-discounts.service.js";
import { bulkVehicleListingDiscountsRepository } from "./bulk-vehicle-listing-discounts.repository.js";
import type {
  BulkApplyVehicleListingDiscountsInput,
  BulkVehicleDiscountCandidatesQuery,
} from "./bulk-vehicle-listing-discounts.schema.js";
import type { VehicleSpecField } from "../../generated/prisma/index.js";

// Every vehicle (transport) category lives under this one root — same
// convention ProductFitmentRule's assertIsVehicleCategory relies on.
const VEHICLE_ROOT_CATEGORY_SLUG = "transport";

// Only the LOOKUP-kind spec fields make sense as a filter dimension here
// (a small enumerable set of values) — mirrors the same restriction used
// throughout this session (ProductFitmentRule's SPEC type, the removed
// VehicleListingDiscountRule).
const LOOKUP_SPEC_FIELDS = (Object.keys(VEHICLE_SPEC_FIELDS) as VehicleSpecField[]).filter(
  (field) => VEHICLE_SPEC_FIELDS[field].kind === "LOOKUP",
);

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };

type CandidateVehicleCatalogRow = {
  variant: string;
  brand: NamedRefRow;
  model: NamedRefRow;
  fuelType: LookupRow | null;
  transmissionType: LookupRow | null;
  coolingType: LookupRow | null;
  finalDriveType: LookupRow | null;
  driveType: LookupRow | null;
  startType: LookupRow | null;
  powertrainType: LookupRow | null;
};

type CandidateListingRow = {
  id: number;
  year: number;
  price: { toString(): string };
  condition: LookupRow;
  color: LookupRow;
  vehicleCatalog: CandidateVehicleCatalogRow;
  discounts: { discountPercent: { toString(): string } | null; startDate: Date; endDate: Date }[];
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function findActiveDiscount(discounts: CandidateListingRow["discounts"]) {
  const now = new Date();
  return discounts.find((discount) => discount.startDate <= now && now <= discount.endDate) ?? null;
}

function specValuesFor(catalog: CandidateVehicleCatalogRow) {
  const values: { field: VehicleSpecField; fieldLabel: { ka: string; en: string; ru: string }; value: LookupRow }[] = [];
  for (const field of LOOKUP_SPEC_FIELDS) {
    const value: LookupRow | null =
      field === "FUEL_TYPE"
        ? catalog.fuelType
        : field === "TRANSMISSION_TYPE"
          ? catalog.transmissionType
          : field === "COOLING_TYPE"
            ? catalog.coolingType
            : field === "FINAL_DRIVE_TYPE"
              ? catalog.finalDriveType
              : field === "DRIVE_TYPE"
                ? catalog.driveType
                : field === "START_TYPE"
                  ? catalog.startType
                  : catalog.powertrainType;
    if (!value) continue;
    const definition = VEHICLE_SPEC_FIELDS[field];
    values.push({
      field,
      fieldLabel: { ka: definition.nameKa, en: definition.nameEn, ru: definition.nameRu },
      value,
    });
  }
  return values;
}

function toCandidateResponse(row: CandidateListingRow) {
  const activeDiscount = findActiveDiscount(row.discounts);
  return {
    vehicleListingId: row.id,
    brand: toNamedRef(row.vehicleCatalog.brand),
    model: toNamedRef(row.vehicleCatalog.model),
    variant: row.vehicleCatalog.variant,
    year: row.year,
    condition: row.condition,
    color: row.color,
    specValues: specValuesFor(row.vehicleCatalog),
    price: Number(row.price),
    activeDiscount: activeDiscount
      ? {
          discountPercent: activeDiscount.discountPercent != null ? Number(activeDiscount.discountPercent) : null,
          startDate: activeDiscount.startDate,
          endDate: activeDiscount.endDate,
        }
      : null,
  };
}

async function assertIsVehicleCategory(categoryId: number) {
  const category = await categoriesRepository.findById(categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }

  const ancestorIds = await resolveCategoryAndAncestorIds(categoryId);
  const rootId = ancestorIds[ancestorIds.length - 1];
  const root = await categoriesRepository.findById(rootId);
  if (root?.slug !== VEHICLE_ROOT_CATEGORY_SLUG) {
    throw new ApiError(400, "მითითებული კატეგორია ტრანსპორტის კატეგორია არ არის");
  }
}

export async function listBulkVehicleDiscountCandidates(query: BulkVehicleDiscountCandidatesQuery) {
  await assertIsVehicleCategory(query.categoryId);

  const categoryIds = await resolveCategoryAndDescendantIds(query.categoryId);
  const rows = await bulkVehicleListingDiscountsRepository.findCandidateListings(categoryIds);
  return rows.map(toCandidateResponse);
}

function applyPercentDiscount(price: number, percent: number): number {
  return Math.round(price * (1 - percent / 100) * 100) / 100;
}

export async function applyBulkVehicleListingDiscounts(input: BulkApplyVehicleListingDiscountsInput) {
  const listings = await bulkVehicleListingDiscountsRepository.findListingsForDiscount(
    input.vehicleListingIds,
  );
  if (listings.length === 0) {
    throw new ApiError(400, "მითითებული განცხადებები ვერ მოიძებნა");
  }

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  const rows = listings.map((listing) => ({
    vehicleListingId: listing.id,
    discountPrice: applyPercentDiscount(Number(listing.price), input.discountPercent),
    discountPercent: input.discountPercent,
    startDate,
    endDate,
  }));

  const created = await bulkVehicleListingDiscountsRepository.bulkCreateDiscounts(rows);
  return created.map((row) => toDiscountResponse(row as DiscountRow));
}

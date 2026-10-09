import { prisma } from "../../config/prisma.js";
import { ApiError } from "../../lib/ApiError.js";
import { findActiveDiscount } from "../../lib/discounts.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { resolveCategoryAndDescendantIds } from "../categories/categories.service.js";
import { startOfDayTbilisi, endOfDayTbilisi, toTbilisiDateOnly } from "../../lib/tbilisi-dates.js";
import { VEHICLE_SPEC_FIELDS } from "../vehicle-category-filters/vehicle-spec-fields.registry.js";
import {
  toDiscountResponse as toProductDiscountResponse,
  type DiscountRow as ProductDiscountRow,
} from "../product-variant-discounts/product-variant-discounts.service.js";
import {
  toDiscountResponse as toVehicleDiscountResponse,
  type DiscountRow as VehicleDiscountRow,
} from "../vehicle-listing-discounts/vehicle-listing-discounts.service.js";
import { bulkDiscountEventsRepository } from "../bulk-discount-events/bulk-discount-events.repository.js";
import { bulkDiscountsRepository } from "./bulk-discounts.repository.js";
import type {
  BulkApplyDiscountsInput,
  BulkDiscountCandidatesQuery,
  ListDiscountHistoryQuery,
} from "./bulk-discounts.schema.js";
import type { VehicleSpecField } from "../../generated/prisma/index.js";

type BrandModelRefRow = { id: number; name: string; slug: string };
type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };

function applyPercentDiscount(price: number, percent: number): number {
  return Math.round(price * (1 - percent / 100) * 100) / 100;
}

function computeDiscountStatus(row: { startDate: Date; endDate: Date }) {
  const now = new Date();
  if (now < row.startDate) return "SCHEDULED" as const;
  if (now > row.endDate) return "EXPIRED" as const;
  return "ACTIVE" as const;
}

// Same guard as the single-discount paths (product-variant-discounts.
// service.ts / vehicle-listing-discounts.service.ts) — without it, a bulk
// apply could silently create a batch of already-expired discount rows
// (endDate is a calendar day, so "today" still passes: the active-window
// check elsewhere treats it as valid through 23:59:59 today Tbilisi time,
// not just up to the current instant).
function assertEndDateNotInPast(endDate: Date) {
  const todayStart = startOfDayTbilisi(toTbilisiDateOnly(new Date()));
  if (endDate < todayStart) {
    throw new ApiError(400, "დასრულების თარიღი არ უნდა იყოს წარსულში");
  }
}

// This admin history view merges product + vehicle history into one
// client-side-combined table (see DiscountHistoryPanel.tsx), which is what
// a real server-paginated (page/pageSize) API would have to coordinate
// across two independent sources — disproportionately complex for what was,
// until now, an unbounded "fetch every discount ever created" query.
// Capping at DISCOUNT_HISTORY_MAX_ROWS (ordered newest-startDate-first, so
// the cap only ever drops the OLDEST history, never anything currently
// active or upcoming) closes the actual unbounded-growth concern without
// that redesign; `truncated` tells the frontend to prompt for a narrower
// search instead of silently hiding older rows with no indication.
const DISCOUNT_HISTORY_MAX_ROWS = 500;

// ============================== PRODUCT ==============================

type CandidateAttributeValueRow = {
  attributeId: number;
  attribute: { id: number; nameKa: string; nameEn: string; nameRu: string; valueType: string };
  valueText: string | null;
  valueNumber: { toString(): string } | null;
  valueBoolean: boolean | null;
  option: { id: number; key: string; labelKa: string; labelEn: string; labelRu: string } | null;
};

type CandidateVariantRow = {
  id: number;
  sku: string | null;
  price: { toString(): string };
  size: LookupRow | null;
  color: LookupRow | null;
  discounts: { discountPercent: { toString(): string } | null; startDate: Date; endDate: Date }[];
};

type CandidateProductRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  productBrand: BrandModelRefRow | null;
  attributeValues: CandidateAttributeValueRow[];
  variants: CandidateVariantRow[];
};

// One row per variant, product info denormalized onto each — the bulk
// discount table is variant-level (price/size/color live on the variant,
// not the product), so this flattens rather than nesting variants under
// products the way the regular product list/detail responses do.
function toProductCandidateRows(product: CandidateProductRow) {
  const attributeValues = product.attributeValues.map((value) => ({
    attributeId: value.attributeId,
    attributeName: { ka: value.attribute.nameKa, en: value.attribute.nameEn, ru: value.attribute.nameRu },
    valueType: value.attribute.valueType,
    valueText: value.valueText,
    valueNumber: value.valueNumber != null ? Number(value.valueNumber) : null,
    valueBoolean: value.valueBoolean,
    option: value.option
      ? {
          id: value.option.id,
          key: value.option.key,
          label: { ka: value.option.labelKa, en: value.option.labelEn, ru: value.option.labelRu },
        }
      : null,
  }));

  return product.variants.map((variant) => {
    const activeDiscount = findActiveDiscount(variant.discounts);
    return {
      variantId: variant.id,
      productId: product.id,
      productName: { ka: product.nameKa, en: product.nameEn, ru: product.nameRu },
      productSlug: product.slug,
      brand: product.productBrand,
      attributeValues,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      price: Number(variant.price),
      activeDiscount: activeDiscount
        ? {
            discountPercent: activeDiscount.discountPercent != null ? Number(activeDiscount.discountPercent) : null,
            startDate: activeDiscount.startDate,
            endDate: activeDiscount.endDate,
          }
        : null,
    };
  });
}

async function listProductCandidates(categoryId: number) {
  const categoryIds = await resolveCategoryAndDescendantIds(categoryId);
  const products = await bulkDiscountsRepository.findCandidateProducts(categoryIds);
  return products.flatMap(toProductCandidateRows);
}

async function applyProductDiscounts(input: BulkApplyDiscountsInput) {
  const variants = await bulkDiscountsRepository.findVariantsForDiscount(input.itemIds);
  if (variants.length === 0) {
    throw new ApiError(400, "მითითებული ვარიანტები ვერ მოიძებნა");
  }

  const startDate = startOfDayTbilisi(input.startDate);
  const endDate = endOfDayTbilisi(input.endDate);
  assertEndDateNotInPast(endDate);

  const rows = variants.map((variant) => ({
    productVariantId: variant.id,
    discountPrice: applyPercentDiscount(Number(variant.price), input.discountPercent),
    discountPercent: input.discountPercent,
    startDate,
    endDate,
  }));

  // One transaction so the (optional) event row and every discount row it
  // groups commit or roll back together — without input.event, this is
  // exactly the same "create N independent rows" behavior as before this
  // field existed (event stays null, bulkDiscountEventId stays null on
  // every row).
  const { created, eventId } = await prisma.$transaction(async (tx) => {
    const event = input.event
      ? await bulkDiscountEventsRepository.create(
          {
            nameKa: input.event.nameKa,
            nameEn: input.event.nameEn,
            nameRu: input.event.nameRu,
            descriptionKa: input.event.descriptionKa ?? null,
            descriptionEn: input.event.descriptionEn ?? null,
            descriptionRu: input.event.descriptionRu ?? null,
            targetType: "PRODUCT",
            discountPercent: input.discountPercent,
            startDate,
            endDate,
            itemCount: rows.length,
          },
          tx,
        )
      : null;

    const createdRows = await Promise.all(
      rows.map((row) =>
        bulkDiscountsRepository.createProductDiscount({ ...row, bulkDiscountEventId: event?.id ?? null }, tx),
      ),
    );

    return { created: createdRows, eventId: event?.id ?? null };
  });

  return { items: created.map((row) => toProductDiscountResponse(row as ProductDiscountRow)), eventId };
}

type ProductDiscountHistoryRow = {
  id: number;
  discountPrice: { toString(): string };
  discountPercent: { toString(): string } | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  productVariant: {
    id: number;
    sku: string | null;
    price: { toString(): string };
    size: LookupRow | null;
    color: LookupRow | null;
    product: {
      id: number;
      nameKa: string;
      nameEn: string;
      nameRu: string;
      slug: string;
      productBrand: BrandModelRefRow | null;
    };
  };
};

function toProductDiscountHistoryRow(row: ProductDiscountHistoryRow) {
  return {
    id: row.id,
    variantId: row.productVariant.id,
    productId: row.productVariant.product.id,
    productName: {
      ka: row.productVariant.product.nameKa,
      en: row.productVariant.product.nameEn,
      ru: row.productVariant.product.nameRu,
    },
    productSlug: row.productVariant.product.slug,
    brand: row.productVariant.product.productBrand,
    sku: row.productVariant.sku,
    size: row.productVariant.size,
    color: row.productVariant.color,
    price: Number(row.productVariant.price),
    discountPrice: Number(row.discountPrice),
    discountPercent: row.discountPercent != null ? Number(row.discountPercent) : null,
    startDate: row.startDate,
    endDate: row.endDate,
    computedStatus: computeDiscountStatus(row),
    createdAt: row.createdAt,
  };
}

async function listProductDiscountHistory(query: ListDiscountHistoryQuery) {
  const [rows, total] = await Promise.all([
    bulkDiscountsRepository.findAllProductDiscounts(query.search, DISCOUNT_HISTORY_MAX_ROWS),
    bulkDiscountsRepository.countAllProductDiscounts(query.search),
  ]);
  const allItems = rows.map(toProductDiscountHistoryRow);
  const items = !query.status
    ? allItems
    : allItems.filter((item) =>
        query.status === "active" ? item.computedStatus === "ACTIVE" : item.computedStatus !== "ACTIVE",
      );
  return { items, total, truncated: total > DISCOUNT_HISTORY_MAX_ROWS };
}

// ============================ VEHICLE_LISTING ============================

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

type CandidateVehicleCatalogRow = {
  variant: string;
  brand: BrandModelRefRow;
  model: BrandModelRefRow;
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
  priceCurrency: "GEL" | "USD";
  condition: LookupRow;
  color: LookupRow;
  vehicleCatalog: CandidateVehicleCatalogRow;
  discounts: { discountPercent: { toString(): string } | null; startDate: Date; endDate: Date }[];
};

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

function toVehicleCandidateResponse(row: CandidateListingRow) {
  const activeDiscount = findActiveDiscount(row.discounts);
  return {
    vehicleListingId: row.id,
    brand: row.vehicleCatalog.brand,
    model: row.vehicleCatalog.model,
    variant: row.vehicleCatalog.variant,
    year: row.year,
    condition: row.condition,
    color: row.color,
    specValues: specValuesFor(row.vehicleCatalog),
    price: Number(row.price),
    priceCurrency: row.priceCurrency,
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
  const ancestorIds = await resolveCategoryAndAncestorIds(categoryId);
  const rootId = ancestorIds[ancestorIds.length - 1];
  const root = await categoriesRepository.findById(rootId);
  if (root?.slug !== VEHICLE_ROOT_CATEGORY_SLUG) {
    throw new ApiError(400, "მითითებული კატეგორია ტრანსპორტის კატეგორია არ არის");
  }
}

async function listVehicleCandidates(categoryId: number) {
  await assertIsVehicleCategory(categoryId);

  const categoryIds = await resolveCategoryAndDescendantIds(categoryId);
  const rows = await bulkDiscountsRepository.findCandidateVehicleListings(categoryIds);
  return rows.map(toVehicleCandidateResponse);
}

async function applyVehicleListingDiscounts(input: BulkApplyDiscountsInput) {
  const listings = await bulkDiscountsRepository.findListingsForDiscount(input.itemIds);
  if (listings.length === 0) {
    throw new ApiError(400, "მითითებული განცხადებები ვერ მოიძებნა");
  }

  const startDate = startOfDayTbilisi(input.startDate);
  const endDate = endOfDayTbilisi(input.endDate);
  assertEndDateNotInPast(endDate);

  const rows = listings.map((listing) => ({
    vehicleListingId: listing.id,
    discountPrice: applyPercentDiscount(Number(listing.price), input.discountPercent),
    discountPercent: input.discountPercent,
    startDate,
    endDate,
  }));

  const { created, eventId } = await prisma.$transaction(async (tx) => {
    const event = input.event
      ? await bulkDiscountEventsRepository.create(
          {
            nameKa: input.event.nameKa,
            nameEn: input.event.nameEn,
            nameRu: input.event.nameRu,
            descriptionKa: input.event.descriptionKa ?? null,
            descriptionEn: input.event.descriptionEn ?? null,
            descriptionRu: input.event.descriptionRu ?? null,
            targetType: "VEHICLE_LISTING",
            discountPercent: input.discountPercent,
            startDate,
            endDate,
            itemCount: rows.length,
          },
          tx,
        )
      : null;

    const createdRows = await Promise.all(
      rows.map((row) =>
        bulkDiscountsRepository.createVehicleDiscount({ ...row, bulkDiscountEventId: event?.id ?? null }, tx),
      ),
    );

    return { created: createdRows, eventId: event?.id ?? null };
  });

  return { items: created.map((row) => toVehicleDiscountResponse(row as VehicleDiscountRow)), eventId };
}

type VehicleDiscountHistoryRow = {
  id: number;
  discountPrice: { toString(): string };
  discountPercent: { toString(): string } | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  vehicleListing: {
    id: number;
    year: number;
    price: { toString(): string };
    priceCurrency: "GEL" | "USD";
    condition: LookupRow;
    color: LookupRow;
    vehicleCatalog: { variant: string; brand: BrandModelRefRow; model: BrandModelRefRow };
  };
};

function toVehicleDiscountHistoryRow(row: VehicleDiscountHistoryRow) {
  return {
    id: row.id,
    vehicleListingId: row.vehicleListing.id,
    brand: row.vehicleListing.vehicleCatalog.brand,
    model: row.vehicleListing.vehicleCatalog.model,
    variant: row.vehicleListing.vehicleCatalog.variant,
    year: row.vehicleListing.year,
    condition: row.vehicleListing.condition,
    color: row.vehicleListing.color,
    price: Number(row.vehicleListing.price),
    priceCurrency: row.vehicleListing.priceCurrency,
    discountPrice: Number(row.discountPrice),
    discountPercent: row.discountPercent != null ? Number(row.discountPercent) : null,
    startDate: row.startDate,
    endDate: row.endDate,
    computedStatus: computeDiscountStatus(row),
    createdAt: row.createdAt,
  };
}

async function listVehicleDiscountHistory(query: ListDiscountHistoryQuery) {
  const [rows, total] = await Promise.all([
    bulkDiscountsRepository.findAllVehicleDiscounts(query.search, DISCOUNT_HISTORY_MAX_ROWS),
    bulkDiscountsRepository.countAllVehicleDiscounts(query.search),
  ]);
  const allItems = rows.map(toVehicleDiscountHistoryRow);
  const items = !query.status
    ? allItems
    : allItems.filter((item) =>
        query.status === "active" ? item.computedStatus === "ACTIVE" : item.computedStatus !== "ACTIVE",
      );
  return { items, total, truncated: total > DISCOUNT_HISTORY_MAX_ROWS };
}

// ================================ Public API ================================
// Each dispatches on targetType to the PRODUCT/VEHICLE_LISTING implementation
// above — the two underlying data models are different enough that forcing
// one code path would need its own branching internally anyway; this keeps
// that branching at the single entry point instead of duplicating it (along
// with the schema/repository/routes) across two whole modules.

export async function listBulkDiscountCandidates(query: BulkDiscountCandidatesQuery) {
  const category = await categoriesRepository.findById(query.categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }

  return query.targetType === "PRODUCT"
    ? listProductCandidates(query.categoryId)
    : listVehicleCandidates(query.categoryId);
}

export async function applyBulkDiscounts(input: BulkApplyDiscountsInput) {
  return input.targetType === "PRODUCT" ? applyProductDiscounts(input) : applyVehicleListingDiscounts(input);
}

export async function listDiscountHistory(query: ListDiscountHistoryQuery) {
  return query.targetType === "PRODUCT" ? listProductDiscountHistory(query) : listVehicleDiscountHistory(query);
}

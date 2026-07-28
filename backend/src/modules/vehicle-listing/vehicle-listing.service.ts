import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { vehicleCatalogRepository } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import {
  toDiscountResponse,
  type DiscountRow,
} from "../vehicle-listing-discounts/vehicle-listing-discounts.service.js";
import { toImageResponse } from "../vehicle-listing-images/vehicle-listing-images.service.js";
import { vehicleListingRepository } from "./vehicle-listing.repository.js";
import type {
  CreateVehicleListingInput,
  UpdateVehicleListingInput,
} from "./vehicle-listing.schema.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };
type ImageRow = { id: number; imageUrl: string; position: number };

type VehicleListingRow = {
  id: number;
  vehicleCatalog: {
    id: number;
    brand: NamedRefRow;
    model: NamedRefRow & { category: NamedRefRow };
    yearFrom: number | null;
    yearTo: number | null;
    imageUrl: string | null;
  };
  condition: LookupRow;
  status: LookupRow;
  color: LookupRow;
  year: number;
  isActive: boolean;
  price: { toString(): string };
  stockQuantity: number;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  images: ImageRow[];
  discounts: DiscountRow[];
  createdAt: Date;
  updatedAt: Date;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function findActiveDiscount(discounts: DiscountRow[]) {
  const now = new Date();
  return (
    discounts.find((discount) => discount.startDate <= now && now <= discount.endDate) ?? null
  );
}

function toResponse(row: VehicleListingRow) {
  const activeDiscount = findActiveDiscount(row.discounts);

  return {
    id: row.id,
    vehicleCatalog: {
      id: row.vehicleCatalog.id,
      category: toNamedRef(row.vehicleCatalog.model.category),
      brand: toNamedRef(row.vehicleCatalog.brand),
      model: toNamedRef(row.vehicleCatalog.model),
      yearFrom: row.vehicleCatalog.yearFrom,
      yearTo: row.vehicleCatalog.yearTo,
      imageUrl: row.vehicleCatalog.imageUrl,
    },
    condition: row.condition,
    status: row.status,
    color: row.color,
    year: row.year,
    isActive: row.isActive,
    price: Number(row.price),
    stockQuantity: row.stockQuantity,
    descriptionKa: row.descriptionKa,
    descriptionEn: row.descriptionEn,
    descriptionRu: row.descriptionRu,
    images: row.images.map(toImageResponse),
    discounts: row.discounts.map(toDiscountResponse),
    activeDiscount: activeDiscount ? toDiscountResponse(activeDiscount) : null,
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

export async function listVehicleListings() {
  const rows = await vehicleListingRepository.findMany();
  return rows.map(toResponse);
}

export async function getVehicleListing(id: number) {
  const row = await vehicleListingRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "განცხადება ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createVehicleListing(input: CreateVehicleListingInput) {
  await assertRefsExist(input);

  const row = await vehicleListingRepository.create(input);
  return toResponse(row);
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
  return toResponse(row);
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

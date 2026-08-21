import { ApiError } from "../../lib/ApiError.js";
import { saveUploadedImage } from "../../lib/storage.js";
import { vehicleCatalogRepository } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { toVehicleCatalogResponse } from "../vehicle-catalog/vehicle-catalog.service.js";
import { garageRepository } from "./garage.repository.js";
import type { CreateGarageVehicleInput, UpdateGarageVehicleInput } from "./garage.schema.js";

function formatYearRange(yearFrom: number | null, yearTo: number | null) {
  if (yearFrom != null && yearTo != null) return `${yearFrom}–${yearTo}`;
  if (yearFrom != null) return `${yearFrom}+`;
  return `≤${yearTo}`;
}

async function assertCatalogEntryFitsYear(vehicleCatalogId: number, year: number) {
  const catalogEntry = await vehicleCatalogRepository.findById(vehicleCatalogId);
  if (!catalogEntry) {
    throw new ApiError(400, "მითითებული ტექნიკის კატალოგის ჩანაწერი არ არსებობს");
  }

  const outOfRange =
    (catalogEntry.yearFrom != null && year < catalogEntry.yearFrom) ||
    (catalogEntry.yearTo != null && year > catalogEntry.yearTo);
  if (outOfRange) {
    throw new ApiError(
      400,
      `წელი (${year}) არ ჯდება კატალოგის ჩანაწერის დასაშვებ დიაპაზონში (${formatYearRange(catalogEntry.yearFrom, catalogEntry.yearTo)})`,
    );
  }
}

function toResponse(row: {
  id: number;
  year: number;
  vin: string | null;
  imageUrl: string | null;
  vehicleCatalog: Parameters<typeof toVehicleCatalogResponse>[0];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    year: row.year,
    vin: row.vin,
    imageUrl: row.imageUrl,
    vehicleCatalog: toVehicleCatalogResponse(row.vehicleCatalog),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listMyGarage(userId: number) {
  const rows = await garageRepository.findByUserId(userId);
  return rows.map(toResponse);
}

export async function createGarageVehicle(userId: number, input: CreateGarageVehicleInput) {
  await assertCatalogEntryFitsYear(input.vehicleCatalogId, input.year);

  const row = await garageRepository.createWithPopularityBump({
    userId,
    vehicleCatalogId: input.vehicleCatalogId,
    year: input.year,
    vin: input.vin ?? null,
  });
  return toResponse(row);
}

export async function updateGarageVehicle(
  userId: number,
  id: number,
  input: UpdateGarageVehicleInput,
) {
  const existing = await garageRepository.findById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, "გარაჟის ჩანაწერი ვერ მოიძებნა");
  }

  await assertCatalogEntryFitsYear(input.vehicleCatalogId, input.year);

  const row = await garageRepository.updateWithPopularityBump(
    id,
    {
      vehicleCatalogId: input.vehicleCatalogId,
      year: input.year,
      vin: input.vin ?? null,
    },
    input.vehicleCatalogId !== existing.vehicleCatalogId ? existing.vehicleCatalogId : undefined,
  );
  return toResponse(row);
}

export async function setGarageVehicleImage(
  userId: number,
  id: number,
  file: Express.Multer.File,
) {
  const existing = await garageRepository.findById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, "გარაჟის ჩანაწერი ვერ მოიძებნა");
  }

  const imageUrl = await saveUploadedImage("garage-vehicles", file);
  const row = await garageRepository.updateImage(id, imageUrl);
  return toResponse(row);
}

export async function deleteGarageVehicle(userId: number, id: number) {
  const existing = await garageRepository.findById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, "გარაჟის ჩანაწერი ვერ მოიძებნა");
  }

  await garageRepository.deleteWithPopularityBump(id, existing.vehicleCatalogId);
}

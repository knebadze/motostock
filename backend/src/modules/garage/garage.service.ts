import { ApiError } from "../../lib/ApiError.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { vehicleCatalogRepository } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { toVehicleCatalogResponse } from "../vehicle-catalog/vehicle-catalog.service.js";
import { usersRepository } from "../users/users.repository.js";
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
    throw new ApiError(
      400,
      "მითითებული ტექნიკის კატალოგის ჩანაწერი არ არსებობს",
      "VEHICLE_CATALOG_ENTRY_NOT_FOUND",
    );
  }

  const outOfRange =
    (catalogEntry.yearFrom != null && year < catalogEntry.yearFrom) ||
    (catalogEntry.yearTo != null && year > catalogEntry.yearTo);
  if (outOfRange) {
    const range = formatYearRange(catalogEntry.yearFrom, catalogEntry.yearTo);
    throw new ApiError(
      400,
      `წელი (${year}) არ ჯდება კატალოგის ჩანაწერის დასაშვებ დიაპაზონში (${range})`,
      "VEHICLE_YEAR_OUT_OF_RANGE",
      { year, range },
    );
  }
}

export function toResponse(row: {
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
  // Guards the users.service.ts mergeUserInto data black hole: without this,
  // a vehicle could still be added to a walk-in row that's already been
  // merged away (mergedIntoUserId set) — silently invisible, since the admin
  // workshop screen and the customer's own account both work off the MERGE
  // TARGET's garage from that point on, never this row's again.
  const user = await usersRepository.findById(userId);
  if (!user || user.mergedIntoUserId != null) {
    throw new ApiError(
      400,
      "მომხმარებელი შერწყმულია სხვა ანგარიშთან — გამოიყენეთ სამიზნე ანგარიშის გვერდი",
      "USER_ALREADY_MERGED",
    );
  }

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
    throw new ApiError(404, "გარაჟის ჩანაწერი ვერ მოიძებნა", "GARAGE_VEHICLE_NOT_FOUND");
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
    throw new ApiError(404, "გარაჟის ჩანაწერი ვერ მოიძებნა", "GARAGE_VEHICLE_NOT_FOUND");
  }

  const imageUrl = await saveUploadedImage("garage-vehicles", file);
  const row = await garageRepository.updateImage(id, imageUrl);
  void deleteUploadedImage(existing.imageUrl);
  return toResponse(row);
}

export async function deleteGarageVehicle(userId: number, id: number) {
  const existing = await garageRepository.findById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, "გარაჟის ჩანაწერი ვერ მოიძებნა", "GARAGE_VEHICLE_NOT_FOUND");
  }

  await garageRepository.deleteWithPopularityBump(id, existing.vehicleCatalogId);
  void deleteUploadedImage(existing.imageUrl);
}

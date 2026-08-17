import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { saveUploadedImage } from "../../lib/storage.js";
import { brandsRepository } from "../brands/brands.repository.js";
import { modelsRepository } from "../models/models.repository.js";
import { getLookupDelegate, type LookupType } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { applyVehicleCatalogAdminFilters } from "../filters/vehicle-catalog/vehicle-catalog-filter-registry.js";
import { vehicleCatalogRepository } from "./vehicle-catalog.repository.js";
import type {
  CreateVehicleCatalogInput,
  SubmitVehicleCatalogInput,
  UpdateVehicleCatalogInput,
  VehicleCatalogListQuery,
} from "./vehicle-catalog.schema.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string } | null;
type SubmitterRow = { id: number; firstName: string; lastName: string } | null;

type VehicleCatalogRow = {
  id: number;
  brand: NamedRefRow;
  model: NamedRefRow & { category: NamedRefRow };
  submittedBy: SubmitterRow;
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
  fuelType: LookupRow;
  transmissionType: LookupRow;
  coolingType: LookupRow;
  finalDriveType: LookupRow;
  driveType: LookupRow;
  startType: LookupRow;
  powertrainType: LookupRow;
  motorPowerWatt: number | null;
  batteryCapacityWh: number | null;
  rangeKm: number | null;
  chargingTimeMinutes: number | null;
  hasLockingDifferential: boolean | null;
  imageUrl: string | null;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  popularity: number;
  createdAt: Date;
  updatedAt: Date;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

export function toVehicleCatalogResponse(row: VehicleCatalogRow) {
  return {
    id: row.id,
    category: toNamedRef(row.model.category),
    brand: toNamedRef(row.brand),
    model: toNamedRef(row.model),
    submittedBy: row.submittedBy
      ? { id: row.submittedBy.id, name: `${row.submittedBy.firstName} ${row.submittedBy.lastName}` }
      : null,
    variant: row.variant,
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
    engineVolumeCc: row.engineVolumeCc,
    enginePowerHp: row.enginePowerHp,
    cylinderCount: row.cylinderCount,
    gearCount: row.gearCount,
    seatCount: row.seatCount,
    weightKg: row.weightKg,
    seatHeightMm: row.seatHeightMm,
    fuelTankLiters: row.fuelTankLiters != null ? Number(row.fuelTankLiters) : null,
    topSpeedKmh: row.topSpeedKmh,
    hasAbs: row.hasAbs,
    fuelType: row.fuelType,
    transmissionType: row.transmissionType,
    coolingType: row.coolingType,
    finalDriveType: row.finalDriveType,
    driveType: row.driveType,
    startType: row.startType,
    powertrainType: row.powertrainType,
    motorPowerWatt: row.motorPowerWatt,
    batteryCapacityWh: row.batteryCapacityWh,
    rangeKm: row.rangeKm,
    chargingTimeMinutes: row.chargingTimeMinutes,
    hasLockingDifferential: row.hasLockingDifferential,
    imageUrl: row.imageUrl,
    descriptionKa: row.descriptionKa,
    descriptionEn: row.descriptionEn,
    descriptionRu: row.descriptionRu,
    popularity: row.popularity,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertOptionalLookupExists(
  id: number | null | undefined,
  type: LookupType,
  label: string,
) {
  if (id == null) return;
  const record = await lookupsRepository.findById(getLookupDelegate(type), id);
  if (!record) {
    throw new ApiError(400, `მითითებული ${label} არ არსებობს`);
  }
}

// Exported for reuse by vehicle-catalog-bulk-import.service.ts, which needs
// the exact same per-row FK validation as the single-row create endpoint.
export async function assertRefsExist(input: {
  brandId: number;
  modelId: number;
  fuelTypeId?: number | null;
  transmissionTypeId?: number | null;
  coolingTypeId?: number | null;
  finalDriveTypeId?: number | null;
  driveTypeId?: number | null;
  startTypeId?: number | null;
  powertrainTypeId?: number | null;
}) {
  const brand = await brandsRepository.findById(input.brandId);
  if (!brand) {
    throw new ApiError(400, "მითითებული მარკა არ არსებობს");
  }

  const model = await modelsRepository.findById(input.modelId);
  if (!model) {
    throw new ApiError(400, "მითითებული მოდელი არ არსებობს");
  }
  if (model.brandId !== input.brandId) {
    throw new ApiError(400, "მითითებული მოდელი არ ეკუთვნის ამორჩეულ მარკას");
  }

  await assertOptionalLookupExists(input.fuelTypeId, "fuel-types", "საწვავის ტიპი");
  await assertOptionalLookupExists(
    input.transmissionTypeId,
    "transmission-types",
    "გადაცემათა კოლოფის ტიპი",
  );
  await assertOptionalLookupExists(input.coolingTypeId, "cooling-types", "გაგრილების ტიპი");
  await assertOptionalLookupExists(
    input.finalDriveTypeId,
    "final-drive-types",
    "საბოლოო გადაცემის ტიპი",
  );
  await assertOptionalLookupExists(input.driveTypeId, "drive-types", "წამყვანი თვლების ტიპი");
  await assertOptionalLookupExists(input.startTypeId, "start-types", "გაშვების სისტემა");
  await assertOptionalLookupExists(
    input.powertrainTypeId,
    "powertrain-types",
    "ძრავის კვების ტიპი",
  );
}

export async function listVehicleCatalog(query: VehicleCatalogListQuery = {}) {
  const where = applyVehicleCatalogAdminFilters(query.adminFilters);
  const rows = await vehicleCatalogRepository.findMany(where);
  return rows.map(toVehicleCatalogResponse);
}

export async function getVehicleCatalogEntry(id: number) {
  const row = await vehicleCatalogRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "ტექნიკის ჩანაწერი ვერ მოიძებნა");
  }
  return toVehicleCatalogResponse(row);
}

// Exported for reuse by vehicle-catalog-bulk-import.service.ts — see
// assertRefsExist above for the same reasoning.
export async function assertNoDuplicate(params: {
  modelId: number;
  variant: string;
  yearFrom: number | null;
  yearTo: number | null;
  excludeId?: number;
}) {
  const duplicate = await vehicleCatalogRepository.findDuplicate(params);
  if (duplicate) {
    throw new ApiError(
      409,
      "ამ მოდელის, ვარიანტისა და წლების კომბინაციით ჩანაწერი უკვე არსებობს",
    );
  }
}

export async function createVehicleCatalogEntry(input: CreateVehicleCatalogInput) {
  await assertRefsExist(input);

  const variant = input.variant ?? "";
  await assertNoDuplicate({
    modelId: input.modelId,
    variant,
    yearFrom: input.yearFrom ?? null,
    yearTo: input.yearTo ?? null,
  });

  const row = await vehicleCatalogRepository.create({ ...input, variant });
  return toVehicleCatalogResponse(row);
}

function formatYearRange(yearFrom: number | null, yearTo: number | null) {
  if (yearFrom != null && yearTo != null) return `${yearFrom}–${yearTo}`;
  if (yearFrom != null) return `${yearFrom}+`;
  return `≤${yearTo}`;
}

// Self-service: a logged-in customer's garage flow couldn't find their
// vehicle in the catalog, so they submit a reduced spec sheet themselves —
// existing brand/model only (no new-brand/new-model creation), the model
// generation's release years (yearFrom/yearTo, same meaning as the admin
// form), and a handful of the most commonly-known specs. `year` is the
// specific year of the caller's own vehicle — distinct from the catalog
// row's range — validated against it and stored on their GarageVehicle row.
// Immediately adds it to their own garage too, in the same transaction,
// since that's the entire reason they're here.
export async function submitVehicleCatalogEntry(userId: number, input: SubmitVehicleCatalogInput) {
  await assertRefsExist({
    brandId: input.brandId,
    modelId: input.modelId,
    fuelTypeId: input.fuelTypeId,
    transmissionTypeId: input.transmissionTypeId,
  });

  const yearFrom = input.yearFrom ?? null;
  const yearTo = input.yearTo ?? null;
  const outOfRange =
    (yearFrom != null && input.year < yearFrom) || (yearTo != null && input.year > yearTo);
  if (outOfRange) {
    throw new ApiError(
      400,
      `წელი (${input.year}) არ ჯდება მითითებულ გამოშვების დიაპაზონში (${formatYearRange(yearFrom, yearTo)})`,
    );
  }

  const variant = input.variant ?? "";
  await assertNoDuplicate({
    modelId: input.modelId,
    variant,
    yearFrom,
    yearTo,
  });

  const { catalog, garageVehicle } = await vehicleCatalogRepository.createSubmission(
    {
      brandId: input.brandId,
      modelId: input.modelId,
      variant,
      yearFrom,
      yearTo,
      engineVolumeCc: input.engineVolumeCc ?? null,
      enginePowerHp: input.enginePowerHp ?? null,
      fuelTypeId: input.fuelTypeId ?? null,
      transmissionTypeId: input.transmissionTypeId ?? null,
      userId,
    },
    userId,
    input.year,
    input.vin,
  );

  return {
    id: garageVehicle.id,
    year: garageVehicle.year,
    vin: garageVehicle.vin,
    vehicleCatalog: toVehicleCatalogResponse(catalog),
    createdAt: garageVehicle.createdAt,
    updatedAt: garageVehicle.updatedAt,
  };
}

export async function updateVehicleCatalogEntry(id: number, input: UpdateVehicleCatalogInput) {
  const existing = await vehicleCatalogRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ტექნიკის ჩანაწერი ვერ მოიძებნა");
  }

  await assertRefsExist({
    brandId: input.brandId ?? existing.brand.id,
    modelId: input.modelId ?? existing.model.id,
    fuelTypeId: input.fuelTypeId !== undefined ? input.fuelTypeId : existing.fuelType?.id,
    transmissionTypeId:
      input.transmissionTypeId !== undefined
        ? input.transmissionTypeId
        : existing.transmissionType?.id,
    coolingTypeId:
      input.coolingTypeId !== undefined ? input.coolingTypeId : existing.coolingType?.id,
    finalDriveTypeId:
      input.finalDriveTypeId !== undefined
        ? input.finalDriveTypeId
        : existing.finalDriveType?.id,
    driveTypeId: input.driveTypeId !== undefined ? input.driveTypeId : existing.driveType?.id,
    startTypeId: input.startTypeId !== undefined ? input.startTypeId : existing.startType?.id,
    powertrainTypeId:
      input.powertrainTypeId !== undefined
        ? input.powertrainTypeId
        : existing.powertrainType?.id,
  });

  await assertNoDuplicate({
    modelId: input.modelId ?? existing.model.id,
    variant: input.variant ?? existing.variant,
    yearFrom: input.yearFrom !== undefined ? input.yearFrom : existing.yearFrom,
    yearTo: input.yearTo !== undefined ? input.yearTo : existing.yearTo,
    excludeId: id,
  });

  const row = await vehicleCatalogRepository.update(id, input);
  return toVehicleCatalogResponse(row);
}

export async function setVehicleCatalogImage(id: number, file: Express.Multer.File) {
  const existing = await vehicleCatalogRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ტექნიკის ჩანაწერი ვერ მოიძებნა");
  }

  const imageUrl = await saveUploadedImage("vehicle-catalog", file);
  const row = await vehicleCatalogRepository.updateImage(id, imageUrl);
  return toVehicleCatalogResponse(row);
}

export async function deleteVehicleCatalogEntry(id: number) {
  const existing = await vehicleCatalogRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ტექნიკის ჩანაწერი ვერ მოიძებნა");
  }

  try {
    await vehicleCatalogRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        400,
        "ეს ჩანაწერი გამოიყენება სხვა ჩანაწერებში (მაგ. გასაყიდი ტექნიკა), ჯერ წაშალეთ დამოკიდებული ჩანაწერები",
      );
    }
    throw error;
  }
}

import { ApiError } from "../../lib/ApiError.js";
import type { ServicePosition } from "../../generated/prisma/index.js";
import { garageRepository } from "../garage/garage.repository.js";
import { serviceTypesRepository } from "../service-types/service-types.repository.js";
import { teamMembersRepository } from "../team-members/team-members.repository.js";
import { serviceRecordsRepository } from "./service-records.repository.js";
import type { CreateServiceRecordInput, UpdateServiceRecordInput } from "./service-records.schema.js";

type ServiceRecordRow = {
  id: number;
  garageVehicleId: number;
  serviceTypeId: number | null;
  serviceType: { nameKa: string; nameEn: string; nameRu: string } | null;
  customServiceName: string | null;
  mileageKm: number;
  performedAt: Date;
  position: ServicePosition | null;
  filterChanged: boolean | null;
  price: { toString(): string } | null;
  mechanicId: number | null;
  mechanic: { nameKa: string; nameEn: string; nameRu: string } | null;
  notes: string | null;
  recordedByUserId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toResponse(row: ServiceRecordRow) {
  return {
    id: row.id,
    garageVehicleId: row.garageVehicleId,
    serviceTypeId: row.serviceTypeId,
    serviceTypeName: row.serviceType
      ? { ka: row.serviceType.nameKa, en: row.serviceType.nameEn, ru: row.serviceType.nameRu }
      : null,
    customServiceName: row.customServiceName,
    mileageKm: row.mileageKm,
    performedAt: toDateOnly(row.performedAt),
    position: row.position,
    filterChanged: row.filterChanged,
    price: row.price != null ? Number(row.price) : null,
    mechanicId: row.mechanicId,
    mechanicName: row.mechanic
      ? { ka: row.mechanic.nameKa, en: row.mechanic.nameEn, ru: row.mechanic.nameRu }
      : null,
    notes: row.notes,
    recordedByUserId: row.recordedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertMechanicExists(mechanicId: number) {
  const mechanic = await teamMembersRepository.findById(mechanicId);
  if (!mechanic) {
    throw new ApiError(404, "გუნდის წევრი ვერ მოიძებნა");
  }
}

// requestingUserId/isAdmin: an admin can pull any vehicle's history; a
// regular authenticated user only their own (garageVehicle.userId match) —
// this keeps the endpoint reusable later for a customer-facing "my
// vehicle's service history" view without a separate route.
export async function listServiceRecordsForVehicle(
  garageVehicleId: number,
  requestingUserId: number,
  isAdmin: boolean,
) {
  const garageVehicle = await garageRepository.findById(garageVehicleId);
  if (!garageVehicle) {
    throw new ApiError(404, "ტრანსპორტი ვერ მოიძებნა");
  }
  if (!isAdmin && garageVehicle.userId !== requestingUserId) {
    throw new ApiError(403, "წვდომა აკრძალულია");
  }

  const rows = await serviceRecordsRepository.findByGarageVehicleId(garageVehicleId);
  return rows.map(toResponse);
}

export async function createServiceRecord(input: CreateServiceRecordInput, recordedByUserId: number) {
  const garageVehicle = await garageRepository.findById(input.garageVehicleId);
  if (!garageVehicle) {
    throw new ApiError(404, "ტრანსპორტი ვერ მოიძებნა");
  }

  if (input.serviceTypeId != null) {
    const serviceType = await serviceTypesRepository.findById(input.serviceTypeId);
    if (!serviceType) {
      throw new ApiError(404, "სერვისის ტიპი ვერ მოიძებნა");
    }
  }
  if (input.mechanicId != null) {
    await assertMechanicExists(input.mechanicId);
  }

  const row = await serviceRecordsRepository.create({
    garageVehicleId: input.garageVehicleId,
    serviceTypeId: input.serviceTypeId ?? null,
    customServiceName: input.customServiceName ?? null,
    mileageKm: input.mileageKm,
    performedAt: new Date(input.performedAt),
    position: input.position ?? null,
    filterChanged: input.filterChanged ?? null,
    price: input.price ?? null,
    mechanicId: input.mechanicId ?? null,
    notes: input.notes ?? null,
    recordedByUserId,
  });
  return toResponse(row);
}

export async function updateServiceRecord(id: number, input: UpdateServiceRecordInput) {
  const existing = await serviceRecordsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა");
  }
  if (input.mechanicId != null) {
    await assertMechanicExists(input.mechanicId);
  }

  const row = await serviceRecordsRepository.update(id, {
    ...(input.mileageKm !== undefined ? { mileageKm: input.mileageKm } : {}),
    ...(input.performedAt !== undefined ? { performedAt: new Date(input.performedAt) } : {}),
    ...(input.position !== undefined ? { position: input.position } : {}),
    ...(input.filterChanged !== undefined ? { filterChanged: input.filterChanged } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.mechanicId !== undefined ? { mechanicId: input.mechanicId } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  });
  return toResponse(row);
}

export async function deleteServiceRecord(id: number) {
  const existing = await serviceRecordsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა");
  }

  await serviceRecordsRepository.delete(id);
}

import { ApiError } from "../../lib/ApiError.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { addressesRepository } from "./addresses.repository.js";
import type { UpsertAddressInput } from "./addresses.schema.js";

type CityRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };

type AddressRow = {
  id: number;
  phone: string;
  city: CityRow;
  street: string;
  building: string | null;
  apartment: string | null;
  postalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(row: AddressRow) {
  return {
    id: row.id,
    phone: row.phone,
    city: row.city,
    street: row.street,
    building: row.building,
    apartment: row.apartment,
    postalCode: row.postalCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getMyAddress(userId: number) {
  const row = await addressesRepository.findByUserId(userId);
  return row ? toResponse(row) : null;
}

export async function saveMyAddress(userId: number, input: UpsertAddressInput) {
  const city = await lookupsRepository.findById(getLookupDelegate("cities"), input.cityId);
  if (!city) {
    throw new ApiError(400, "მითითებული ქალაქი არ არსებობს");
  }

  const row = await addressesRepository.upsert(userId, {
    phone: input.phone,
    cityId: input.cityId,
    street: input.street,
    building: input.building ?? null,
    apartment: input.apartment ?? null,
    postalCode: input.postalCode ?? null,
  });
  return toResponse(row);
}

import { ApiError } from "../../lib/ApiError.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { addressesRepository } from "./addresses.repository.js";
import type { AddressInput } from "./addresses.schema.js";

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

export function toAddressResponse(row: AddressRow) {
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

async function assertCityExists(cityId: number) {
  const city = await lookupsRepository.findById(getLookupDelegate("cities"), cityId);
  if (!city) {
    throw new ApiError(400, "მითითებული ქალაქი არ არსებობს");
  }
}

export async function listMyAddresses(userId: number) {
  const rows = await addressesRepository.findByUserId(userId);
  return rows.map(toAddressResponse);
}

export async function createMyAddress(userId: number, input: AddressInput) {
  await assertCityExists(input.cityId);

  const row = await addressesRepository.create(userId, {
    phone: input.phone,
    cityId: input.cityId,
    street: input.street,
    building: input.building ?? null,
    apartment: input.apartment ?? null,
    postalCode: input.postalCode ?? null,
  });
  return toAddressResponse(row);
}

export async function updateMyAddress(userId: number, id: number, input: AddressInput) {
  const existing = await addressesRepository.findById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, "მისამართი ვერ მოიძებნა");
  }

  await assertCityExists(input.cityId);

  const row = await addressesRepository.update(id, {
    phone: input.phone,
    cityId: input.cityId,
    street: input.street,
    building: input.building ?? null,
    apartment: input.apartment ?? null,
    postalCode: input.postalCode ?? null,
  });
  return toAddressResponse(row);
}

export async function deleteMyAddress(userId: number, id: number) {
  const existing = await addressesRepository.findById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, "მისამართი ვერ მოიძებნა");
  }

  await addressesRepository.delete(id);
}

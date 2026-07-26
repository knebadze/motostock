import { ApiError } from "../../lib/ApiError.js";
import { vehicleListingRepository } from "../vehicle-listing/vehicle-listing.repository.js";
import { vehicleListingDiscountsRepository } from "./vehicle-listing-discounts.repository.js";
import type {
  CreateVehicleListingDiscountInput,
  UpdateVehicleListingDiscountInput,
} from "./vehicle-listing-discounts.schema.js";

export type DiscountRow = {
  id: number;
  vehicleListingId: number;
  discountPrice: { toString(): string };
  discountPercent: { toString(): string } | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toDiscountResponse(row: DiscountRow) {
  return {
    id: row.id,
    vehicleListingId: row.vehicleListingId,
    discountPrice: Number(row.discountPrice),
    discountPercent: row.discountPercent == null ? null : Number(row.discountPercent),
    startDate: toDateOnly(row.startDate),
    endDate: toDateOnly(row.endDate),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertListingExists(vehicleListingId: number) {
  const listing = await vehicleListingRepository.findById(vehicleListingId);
  if (!listing) {
    throw new ApiError(404, "განცხადება ვერ მოიძებნა");
  }
}

export async function listDiscounts(vehicleListingId: number) {
  await assertListingExists(vehicleListingId);
  const rows = await vehicleListingDiscountsRepository.findMany(vehicleListingId);
  return rows.map(toDiscountResponse);
}

export async function createDiscount(
  vehicleListingId: number,
  input: CreateVehicleListingDiscountInput,
) {
  await assertListingExists(vehicleListingId);

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (endDate <= startDate) {
    throw new ApiError(400, "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ");
  }

  const row = await vehicleListingDiscountsRepository.create({
    vehicleListingId,
    discountPrice: input.discountPrice,
    discountPercent: input.discountPercent ?? null,
    startDate,
    endDate,
  });
  return toDiscountResponse(row);
}

export async function updateDiscount(
  vehicleListingId: number,
  id: number,
  input: UpdateVehicleListingDiscountInput,
) {
  const existing = await vehicleListingDiscountsRepository.findById(id);
  if (!existing || existing.vehicleListingId !== vehicleListingId) {
    throw new ApiError(404, "ფასდაკლება ვერ მოიძებნა");
  }

  const startDate = input.startDate ? new Date(input.startDate) : existing.startDate;
  const endDate = input.endDate ? new Date(input.endDate) : existing.endDate;
  if (endDate <= startDate) {
    throw new ApiError(400, "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ");
  }

  const row = await vehicleListingDiscountsRepository.update(id, {
    ...(input.discountPrice !== undefined ? { discountPrice: input.discountPrice } : {}),
    ...(input.discountPercent !== undefined ? { discountPercent: input.discountPercent } : {}),
    ...(input.startDate !== undefined ? { startDate } : {}),
    ...(input.endDate !== undefined ? { endDate } : {}),
  });
  return toDiscountResponse(row);
}

export async function deleteDiscount(vehicleListingId: number, id: number) {
  const existing = await vehicleListingDiscountsRepository.findById(id);
  if (!existing || existing.vehicleListingId !== vehicleListingId) {
    throw new ApiError(404, "ფასდაკლება ვერ მოიძებნა");
  }

  await vehicleListingDiscountsRepository.delete(id);
}

import { ApiError } from "../../lib/ApiError.js";
import { productVariantsRepository } from "../product-variants/product-variants.repository.js";
import { productVariantDiscountsRepository } from "./product-variant-discounts.repository.js";
import { startOfDayTbilisi, endOfDayTbilisi, toTbilisiDateOnly } from "../../lib/tbilisi-dates.js";
import type {
  CreateProductVariantDiscountInput,
  UpdateProductVariantDiscountInput,
} from "./product-variant-discounts.schema.js";

export type DiscountRow = {
  id: number;
  productVariantId: number;
  discountPrice: { toString(): string };
  discountPercent: { toString(): string } | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export function toDiscountResponse(row: DiscountRow) {
  return {
    id: row.id,
    productVariantId: row.productVariantId,
    discountPrice: Number(row.discountPrice),
    discountPercent: row.discountPercent == null ? null : Number(row.discountPercent),
    startDate: toTbilisiDateOnly(row.startDate),
    endDate: toTbilisiDateOnly(row.endDate),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertVariantExists(productVariantId: number) {
  const variant = await productVariantsRepository.findById(productVariantId);
  if (!variant) {
    throw new ApiError(404, "ვარიანტი ვერ მოიძებნა");
  }
}

export async function listDiscounts(productVariantId: number) {
  await assertVariantExists(productVariantId);
  const rows = await productVariantDiscountsRepository.findMany(productVariantId);
  return rows.map(toDiscountResponse);
}

export async function createDiscount(
  productVariantId: number,
  input: CreateProductVariantDiscountInput,
) {
  await assertVariantExists(productVariantId);

  const startDate = startOfDayTbilisi(input.startDate);
  const endDate = endOfDayTbilisi(input.endDate);
  if (endDate <= startDate) {
    throw new ApiError(400, "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ");
  }
  // Catches an obvious typo (e.g. a wrong year) rather than silently
  // accepting an already-expired discount — endDate is a calendar day, so
  // "today" still passes (the active-window check elsewhere treats it as
  // valid through 23:59:59 today Tbilisi time, not just up to the current
  // instant).
  const todayStart = startOfDayTbilisi(toTbilisiDateOnly(new Date()));
  if (endDate < todayStart) {
    throw new ApiError(400, "დასრულების თარიღი არ უნდა იყოს წარსულში");
  }

  const row = await productVariantDiscountsRepository.create({
    productVariantId,
    discountPrice: input.discountPrice,
    discountPercent: input.discountPercent ?? null,
    startDate,
    endDate,
  });
  return toDiscountResponse(row);
}

export async function updateDiscount(
  productVariantId: number,
  id: number,
  input: UpdateProductVariantDiscountInput,
) {
  const existing = await productVariantDiscountsRepository.findById(id);
  if (!existing || existing.productVariantId !== productVariantId) {
    throw new ApiError(404, "ფასდაკლება ვერ მოიძებნა");
  }

  const startDate = input.startDate ? startOfDayTbilisi(input.startDate) : existing.startDate;
  const endDate = input.endDate ? endOfDayTbilisi(input.endDate) : existing.endDate;
  if (endDate <= startDate) {
    throw new ApiError(400, "დასრულების თარიღი უნდა იყოს დაწყების თარიღის შემდეგ");
  }

  const row = await productVariantDiscountsRepository.update(id, {
    ...(input.discountPrice !== undefined ? { discountPrice: input.discountPrice } : {}),
    ...(input.discountPercent !== undefined ? { discountPercent: input.discountPercent } : {}),
    ...(input.startDate !== undefined ? { startDate } : {}),
    ...(input.endDate !== undefined ? { endDate } : {}),
  });
  return toDiscountResponse(row);
}

export async function deleteDiscount(productVariantId: number, id: number) {
  const existing = await productVariantDiscountsRepository.findById(id);
  if (!existing || existing.productVariantId !== productVariantId) {
    throw new ApiError(404, "ფასდაკლება ვერ მოიძებნა");
  }

  await productVariantDiscountsRepository.delete(id);
}

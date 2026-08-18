import { ApiError } from "../../lib/ApiError.js";
import { findActiveDiscount } from "../../lib/discounts.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { productsRepository } from "../products/products.repository.js";
import { getLookupDelegate, type LookupType } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import {
  toDiscountResponse,
  type DiscountRow,
} from "../product-variant-discounts/product-variant-discounts.service.js";
import { toImageResponse } from "../product-variant-images/product-variant-images.service.js";
import { productVariantsRepository } from "./product-variants.repository.js";
import type {
  CreateProductVariantInput,
  UpdateProductVariantInput,
} from "./product-variants.schema.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string };
type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string } | null;
type ImageRow = { id: number; imageUrl: string; position: number };

type ProductVariantRow = {
  id: number;
  product: { id: number; nameKa: string; nameEn: string; nameRu: string };
  sku: string | null;
  finaId: number | null;
  size: LookupRow;
  color: LookupRow;
  price: { toString(): string };
  stockQuantity: number;
  condition: LookupRow;
  status: LookupRow;
  isActive: boolean;
  images: ImageRow[];
  discounts: DiscountRow[];
  createdAt: Date;
  updatedAt: Date;
};

function toProductRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu } };
}

function toResponse(row: ProductVariantRow) {
  const activeDiscount = findActiveDiscount(row.discounts);

  return {
    id: row.id,
    product: toProductRef(row.product),
    sku: row.sku,
    finaId: row.finaId,
    size: row.size,
    color: row.color,
    price: Number(row.price),
    stockQuantity: row.stockQuantity,
    condition: row.condition,
    status: row.status,
    isActive: row.isActive,
    images: row.images.map(toImageResponse),
    discounts: row.discounts.map(toDiscountResponse),
    activeDiscount: activeDiscount ? toDiscountResponse(activeDiscount) : null,
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

async function assertRefsExist(input: {
  productId: number;
  sizeId?: number | null;
  colorId?: number | null;
  conditionId?: number | null;
  statusId?: number | null;
}) {
  const product = await productsRepository.findById(input.productId);
  if (!product) {
    throw new ApiError(400, "მითითებული პროდუქტი არ არსებობს");
  }

  await assertOptionalLookupExists(input.sizeId, "sizes", "ზომა");
  await assertOptionalLookupExists(input.colorId, "colors", "ფერი");
  await assertOptionalLookupExists(input.conditionId, "conditions", "მდგომარეობა");
  await assertOptionalLookupExists(input.statusId, "listing-statuses", "სტატუსი");
}

export async function listProductVariants(productId?: number) {
  const rows = await productVariantsRepository.findMany(productId);
  return rows.map(toResponse);
}

export async function getProductVariant(id: number) {
  const row = await productVariantsRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "ვარიანტი ვერ მოიძებნა");
  }
  return toResponse(row);
}

async function assertFinaIdAvailable(finaId: number | null | undefined, excludeId?: number) {
  if (finaId == null) return;
  const existing = await productVariantsRepository.findByFinaId(finaId);
  if (existing && existing.id !== excludeId) {
    throw new ApiError(409, "ეს FINA ID უკვე გამოყენებულია სხვა ვარიანტზე");
  }
}

export async function createProductVariant(input: CreateProductVariantInput) {
  await assertRefsExist(input);
  await assertFinaIdAvailable(input.finaId);

  const row = await productVariantsRepository.create(input);
  return toResponse(row);
}

export async function updateProductVariant(id: number, input: UpdateProductVariantInput) {
  const existing = await productVariantsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ვარიანტი ვერ მოიძებნა");
  }

  if (input.finaId !== undefined) {
    await assertFinaIdAvailable(input.finaId, id);
  }

  await assertRefsExist({
    productId: input.productId ?? existing.product.id,
    sizeId: input.sizeId !== undefined ? input.sizeId : existing.size?.id,
    colorId: input.colorId !== undefined ? input.colorId : existing.color?.id,
    conditionId: input.conditionId !== undefined ? input.conditionId : existing.condition?.id,
    statusId: input.statusId !== undefined ? input.statusId : existing.status?.id,
  });

  const row = await productVariantsRepository.update(id, input);
  return toResponse(row);
}

export async function deleteProductVariant(id: number) {
  const existing = await productVariantsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ვარიანტი ვერ მოიძებნა");
  }

  try {
    await productVariantsRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(400, "ეს ჩანაწერი გამოიყენება სხვა ჩანაწერებში, ვერ წაიშლება");
    }
    throw error;
  }
}

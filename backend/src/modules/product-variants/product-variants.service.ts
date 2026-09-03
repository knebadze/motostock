import { ApiError } from "../../lib/ApiError.js";
import { findActiveDiscount } from "../../lib/discounts.js";
import { isForeignKeyViolation, isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
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

async function assertSkuAvailable(sku: string | null | undefined, excludeId?: number) {
  if (sku == null) return;
  const existing = await productVariantsRepository.findBySku(sku);
  if (existing && existing.id !== excludeId) {
    throw new ApiError(409, "ეს SKU უკვე გამოყენებულია სხვა ვარიანტზე");
  }
}

export async function createProductVariant(input: CreateProductVariantInput) {
  await assertRefsExist(input);
  await assertFinaIdAvailable(input.finaId);
  await assertSkuAvailable(input.sku);

  try {
    const row = await productVariantsRepository.create(input);
    return toResponse(row);
  } catch (err) {
    // A concurrent request can pass the pre-check above before either
    // commits (same double-submit/race window as registerUser's email
    // check, oauth.service.ts's, etc.) — surface the same clean 409 instead
    // of a raw 500.
    if (!isUniqueConstraintViolation(err, "sku")) throw err;
    throw new ApiError(409, "ეს SKU უკვე გამოყენებულია სხვა ვარიანტზე");
  }
}

export async function updateProductVariant(id: number, input: UpdateProductVariantInput) {
  const existing = await productVariantsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ვარიანტი ვერ მოიძებნა");
  }

  // Mirrors product-variant-discounts.service.ts's
  // assertDiscountPriceBelowListPrice, in the opposite direction —
  // that guard only checks a discount against the variant's price *at the
  // moment the discount is created/edited*; without this, lowering the
  // variant's own price afterward could leave an active discount priced
  // *above* the new list price, and findActiveDiscount/checkout would
  // charge that stale, now-higher "discount" price without ever
  // questioning it (a real overcharge, not just a display glitch).
  if (input.price !== undefined) {
    const activeDiscount = findActiveDiscount(existing.discounts);
    if (activeDiscount && Number(input.price) <= Number(activeDiscount.discountPrice)) {
      throw new ApiError(
        400,
        "ახალი ფასი ვერ იქნება აქტიური ფასდაკლების ფასზე დაბალი ან ტოლი — ჯერ შეცვალეთ ან გააუქმეთ ფასდაკლება",
      );
    }
  }

  if (input.finaId !== undefined) {
    await assertFinaIdAvailable(input.finaId, id);
  }
  if (input.sku !== undefined) {
    await assertSkuAvailable(input.sku, id);
  }

  await assertRefsExist({
    productId: input.productId ?? existing.product.id,
    sizeId: input.sizeId !== undefined ? input.sizeId : existing.size?.id,
    colorId: input.colorId !== undefined ? input.colorId : existing.color?.id,
    conditionId: input.conditionId !== undefined ? input.conditionId : existing.condition?.id,
    statusId: input.statusId !== undefined ? input.statusId : existing.status?.id,
  });

  try {
    const row = await productVariantsRepository.update(id, input);
    return toResponse(row);
  } catch (err) {
    if (!isUniqueConstraintViolation(err, "sku")) throw err;
    throw new ApiError(409, "ეს SKU უკვე გამოყენებულია სხვა ვარიანტზე");
  }
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

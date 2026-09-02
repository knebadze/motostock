import { ApiError } from "../../lib/ApiError.js";
import { productsRepository } from "../products/products.repository.js";
import { toResponse as toProductResponse } from "../products/products.service.js";
import { productFitmentRepository } from "../product-fitment/product-fitment.repository.js";
import { productFitmentRulesRepository } from "../product-fitment-rules/product-fitment-rules.repository.js";
import { getCompatibleVehiclesForProduct } from "../compatibility/compatibility.service.js";
import { productBuyTogetherRepository } from "./product-buy-together.repository.js";
import type { CreateProductBuyTogetherInput, ListProductBuyTogetherAdminQuery } from "./product-buy-together.schema.js";
import type { Prisma } from "../../generated/prisma/index.js";

type ProductBuyTogetherRow = {
  id: number;
  productId: number;
  relatedProduct: Parameters<typeof toProductResponse>[0];
  createdAt: Date;
};

async function toResponse(row: ProductBuyTogetherRow) {
  return {
    id: row.id,
    productId: row.productId,
    relatedProduct: await toProductResponse(row.relatedProduct),
    createdAt: row.createdAt,
  };
}

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type ProductRefRow = NamedRefRow & { category: NamedRefRow };

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function toProductRef(row: ProductRefRow) {
  return {
    id: row.id,
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    slug: row.slug,
    category: toNamedRef(row.category),
  };
}

function toAdminResponse(row: {
  id: number;
  product: ProductRefRow;
  relatedProduct: ProductRefRow;
  createdAt: Date;
}) {
  return {
    id: row.id,
    product: toProductRef(row.product),
    relatedProduct: toProductRef(row.relatedProduct),
    createdAt: row.createdAt,
  };
}

function buildAdminWhere(filters: {
  search?: string;
  categoryId?: number;
}): Prisma.ProductBuyTogetherWhereInput | undefined {
  const and: Prisma.ProductBuyTogetherWhereInput[] = [];

  if (filters.search) {
    const nameContains = (value: string) => [
      { nameKa: { contains: value, mode: "insensitive" as const } },
      { nameEn: { contains: value, mode: "insensitive" as const } },
      { nameRu: { contains: value, mode: "insensitive" as const } },
    ];
    and.push({
      OR: [
        { product: { OR: nameContains(filters.search) } },
        { relatedProduct: { OR: nameContains(filters.search) } },
      ],
    });
  }

  if (filters.categoryId != null) {
    and.push({ product: { categoryId: filters.categoryId } });
  }

  return and.length > 0 ? { AND: and } : undefined;
}

async function assertProductExists(productId: number) {
  const product = await productsRepository.findById(productId);
  if (!product) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }
}

async function hasFitmentData(productId: number): Promise<boolean> {
  const [fitments, rules] = await Promise.all([
    productFitmentRepository.findMany(productId),
    productFitmentRulesRepository.findMany(productId),
  ]);
  return fitments.length > 0 || rules.length > 0;
}

// Cheap sanity guard, not the real fix (see compatibility.service.ts /
// products.service.ts's vehicle-filtered buyTogether for that) — only
// blocks the obviously-wrong case where the two products share literally no
// compatible vehicle at all. Skipped when either side has no fitment data
// configured yet, since absence of data can't prove incompatibility.
async function assertOverlappingCompatibility(productId: number, relatedProductId: number) {
  const [anchorHasData, companionHasData] = await Promise.all([
    hasFitmentData(productId),
    hasFitmentData(relatedProductId),
  ]);
  if (!anchorHasData || !companionHasData) return;

  const [anchorVehicles, companionVehicles] = await Promise.all([
    getCompatibleVehiclesForProduct(productId),
    getCompatibleVehiclesForProduct(relatedProductId),
  ]);
  const companionVehicleIds = new Set(companionVehicles.map((vehicle) => vehicle.id));
  const overlaps = anchorVehicles.some((vehicle) => companionVehicleIds.has(vehicle.id));
  if (!overlaps) {
    throw new ApiError(400, "ეს ორი პროდუქტი არცერთ საერთო ტრანსპორტთან არაა თავსებადი");
  }
}

export async function listProductBuyTogether(productId: number) {
  await assertProductExists(productId);
  const rows = await productBuyTogetherRepository.findMany(productId);
  return Promise.all(rows.map(toResponse));
}

// Admin-only — unified cross-product overview (see /admin/buy-together),
// mirrors compatibility.service.ts's listAllCompatibility.
export async function listAllProductBuyTogether(filters: ListProductBuyTogetherAdminQuery) {
  const rows = await productBuyTogetherRepository.findAll(buildAdminWhere(filters));
  return rows.map(toAdminResponse);
}

export async function createProductBuyTogether(
  productId: number,
  input: CreateProductBuyTogetherInput,
) {
  await assertProductExists(productId);

  if (input.relatedProductId === productId) {
    throw new ApiError(400, "პროდუქტი ვერ დაემატება საკუთარ თავთან ერთად შესაძენად");
  }

  const relatedProduct = await productsRepository.findById(input.relatedProductId);
  if (!relatedProduct) {
    throw new ApiError(400, "მითითებული პროდუქტი არ არსებობს");
  }

  const existing = await productBuyTogetherRepository.findByProductAndRelated(
    productId,
    input.relatedProductId,
  );
  if (existing) {
    throw new ApiError(409, "ეს პროდუქტი უკვე დამატებულია");
  }

  await assertOverlappingCompatibility(productId, input.relatedProductId);

  const row = await productBuyTogetherRepository.create({
    productId,
    relatedProductId: input.relatedProductId,
  });
  return toResponse(row);
}

export async function deleteProductBuyTogether(productId: number, id: number) {
  const existing = await productBuyTogetherRepository.findById(id);
  if (!existing || existing.productId !== productId) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა");
  }

  await productBuyTogetherRepository.delete(id);
}

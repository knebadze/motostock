import { ApiError } from "../../lib/ApiError.js";
import { cache } from "../../lib/cache.js";
import { findActiveDiscount } from "../../lib/discounts.js";
import { computeLowStockQuantity } from "../../lib/low-stock.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { saveUploadedImage } from "../../lib/storage.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { productBrandsRepository } from "../product-brands/product-brands.repository.js";
import { attributesRepository } from "../attributes/attributes.repository.js";
import { attributeOptionsRepository } from "../attribute-options/attribute-options.repository.js";
import { resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { resolveCategoryAndDescendantIds } from "../categories/categories.service.js";
import { vehicleCatalogRepository } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getSpecFieldDefinition } from "../vehicle-category-filters/vehicle-spec-fields.registry.js";
import {
  toDiscountResponse,
  type DiscountRow,
} from "../product-variant-discounts/product-variant-discounts.service.js";
import { toImageResponse } from "../product-variant-images/product-variant-images.service.js";
import { productsRepository } from "./products.repository.js";
import type {
  CreateProductInput,
  ProductAttributeValueInput,
  ProductListQuery,
  UpdateProductInput,
} from "./products.schema.js";
import type { Prisma, VehicleSpecField } from "../../generated/prisma/index.js";

type NamedRefRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  lowStockBadgeEnabled: boolean;
};

type UnitRefRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  abbreviationKa: string;
  abbreviationEn: string;
  abbreviationRu: string;
};

type AttributeValueRow = {
  attributeId: number;
  attribute: {
    id: number;
    nameKa: string;
    nameEn: string;
    nameRu: string;
    valueType: string;
    unit: UnitRefRow | null;
  };
  valueText: string | null;
  valueNumber: { toString(): string } | null;
  valueBoolean: boolean | null;
  option: { id: number; key: string; labelKa: string; labelEn: string; labelRu: string } | null;
};

type DiscountSummaryRow = { discountPrice: { toString(): string }; startDate: Date; endDate: Date };
type VariantSummaryRow = {
  price: { toString(): string };
  stockQuantity: number;
  discounts: DiscountSummaryRow[];
};

function findActiveDiscountPrice(discounts: DiscountSummaryRow[]): number | null {
  const active = findActiveDiscount(discounts);
  return active ? Number(active.discountPrice) : null;
}

// The card shows one price pair, so among every variant currently on
// discount, surface the one with the lowest discounted price (its own
// regular price alongside it, so the crossed-out price always matches the
// discount it belongs to).
function findCardActiveDiscount(
  variants: VariantSummaryRow[],
): { price: number; discountPrice: number } | null {
  let cheapest: { price: number; discountPrice: number } | null = null;
  for (const variant of variants) {
    const discountPrice = findActiveDiscountPrice(variant.discounts);
    if (discountPrice == null) continue;
    if (cheapest == null || discountPrice < cheapest.discountPrice) {
      cheapest = { price: Number(variant.price), discountPrice };
    }
  }
  return cheapest;
}

type ProductRow = {
  id: number;
  category: NamedRefRow;
  productBrand: BrandModelRefRow | null;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  imageUrl: string | null;
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  viewCount: number;
  attributeValues: AttributeValueRow[];
  variants: VariantSummaryRow[];
  createdAt: Date;
  updatedAt: Date;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

// Exported for reuse by product-buy-together.service.ts, which maps related
// Product rows (fetched via productsRepository) through this same "product
// card" response shape.
export function toResponse(row: ProductRow) {
  const totalStock = row.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
  return {
    id: row.id,
    category: toNamedRef(row.category),
    productBrand: row.productBrand,
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    slug: row.slug,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    descriptionKa: row.descriptionKa,
    descriptionEn: row.descriptionEn,
    descriptionRu: row.descriptionRu,
    imageUrl: row.imageUrl,
    attributeValues: row.attributeValues.map((value) => ({
      attributeId: value.attributeId,
      attributeName: {
        ka: value.attribute.nameKa,
        en: value.attribute.nameEn,
        ru: value.attribute.nameRu,
      },
      valueType: value.attribute.valueType,
      unit: value.attribute.unit
        ? {
            id: value.attribute.unit.id,
            name: {
              ka: value.attribute.unit.nameKa,
              en: value.attribute.unit.nameEn,
              ru: value.attribute.unit.nameRu,
            },
            abbreviation: {
              ka: value.attribute.unit.abbreviationKa,
              en: value.attribute.unit.abbreviationEn,
              ru: value.attribute.unit.abbreviationRu,
            },
          }
        : null,
      valueText: value.valueText,
      valueNumber: value.valueNumber != null ? Number(value.valueNumber) : null,
      valueBoolean: value.valueBoolean,
      option: value.option
        ? {
            id: value.option.id,
            key: value.option.key,
            label: { ka: value.option.labelKa, en: value.option.labelEn, ru: value.option.labelRu },
          }
        : null,
    })),
    variantCount: row.variants.length,
    minPrice: row.variants.length > 0 ? Math.min(...row.variants.map((v) => Number(v.price))) : null,
    totalStock,
    lowStockQuantity: computeLowStockQuantity(totalStock, row.category.lowStockBadgeEnabled),
    activeDiscount: findCardActiveDiscount(row.variants),
    viewCount: row.viewCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };
type ImageRow = { id: number; imageUrl: string; position: number };

type VariantDetailRow = {
  id: number;
  sku: string | null;
  price: { toString(): string };
  stockQuantity: number;
  isActive: boolean;
  size: LookupRow | null;
  color: LookupRow | null;
  condition: LookupRow | null;
  status: LookupRow | null;
  images: ImageRow[];
  discounts: DiscountRow[];
};

type BrandModelRefRow = { id: number; name: string; slug: string };

type FitmentRow = {
  vehicleCatalog: {
    id: number;
    brand: BrandModelRefRow;
    model: BrandModelRefRow;
  };
};

type FitmentRuleRow = {
  id: number;
  type: "CATEGORY" | "SPEC" | "ALL";
  category: NamedRefRow | null;
  specField: VehicleSpecField | null;
  specLookupItemId: number | null;
};

type ProductDetailRow = Omit<ProductRow, "variants"> & {
  variants: VariantDetailRow[];
  fitments: FitmentRow[];
  fitmentRules: FitmentRuleRow[];
  buyTogether: { relatedProduct: ProductRow }[];
};

function toVariantDetailResponse(row: VariantDetailRow, lowStockBadgeEnabled: boolean) {
  const activeDiscount = findActiveDiscount(row.discounts);

  return {
    id: row.id,
    sku: row.sku,
    price: Number(row.price),
    stockQuantity: row.stockQuantity,
    // Per-variant, not the product-level totalStock aggregate — the detail
    // page's badge should reflect whichever variant the shopper currently
    // has selected.
    lowStockQuantity: computeLowStockQuantity(row.stockQuantity, lowStockBadgeEnabled),
    isActive: row.isActive,
    size: row.size,
    color: row.color,
    condition: row.condition,
    status: row.status,
    images: row.images.map(toImageResponse),
    discounts: row.discounts.map(toDiscountResponse),
    activeDiscount: activeDiscount ? { discountPrice: Number(activeDiscount.discountPrice) } : null,
  };
}

// Fitment rules aren't enumerated as individual vehicles on the detail page
// (an "all vehicles" rule would mean listing hundreds of catalog rows) —
// instead each rule is summarized as one badge ("Motorcycles", "Final drive:
// chain", "All vehicles"), alongside the explicit fitments list.
async function toFitmentRuleResponse(rule: FitmentRuleRow) {
  let specFieldLabel = null;
  let specValue = null;

  if (rule.specField && rule.specLookupItemId != null) {
    const definition = getSpecFieldDefinition(rule.specField);
    specFieldLabel = { ka: definition.nameKa, en: definition.nameEn, ru: definition.nameRu };
    if (definition.lookupType) {
      specValue = await lookupsRepository.findById(
        getLookupDelegate(definition.lookupType),
        rule.specLookupItemId,
      );
    }
  }

  return {
    id: rule.id,
    type: rule.type,
    category: rule.category ? toNamedRef(rule.category) : null,
    specField: rule.specField,
    specFieldLabel,
    specValue,
  };
}

// Exported for reuse by getProductDetailAdmin below.
export async function toDetailResponse(row: ProductDetailRow) {
  return {
    ...toResponse(row),
    variants: row.variants.map((variant) =>
      toVariantDetailResponse(variant, row.category.lowStockBadgeEnabled),
    ),
    fitments: row.fitments.map((fitment) => ({
      id: fitment.vehicleCatalog.id,
      brand: fitment.vehicleCatalog.brand,
      model: fitment.vehicleCatalog.model,
    })),
    fitmentRules: await Promise.all(row.fitmentRules.map(toFitmentRuleResponse)),
    buyTogether: row.buyTogether.map((link) => toResponse(link.relatedProduct)),
  };
}

async function assertCategoryExists(categoryId: number) {
  const category = await categoriesRepository.findById(categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }
}

async function assertProductBrandExists(productBrandId: number) {
  const productBrand = await productBrandsRepository.findById(productBrandId);
  if (!productBrand) {
    throw new ApiError(400, "მითითებული ბრენდი არ არსებობს");
  }
}

async function assertSlugAvailable(slug: string, excludeId?: number) {
  const existing = await productsRepository.findBySlug(slug);
  if (existing && existing.id !== excludeId) {
    throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
  }
}

// Validates the submitted attribute values against the attributes that
// actually apply to this category (itself + ancestors), checks the
// populated value column matches the attribute's valueType, verifies
// SELECT options belong to their attribute, and confirms every
// attribute marked `required` in that set has a value.
async function buildAttributeValueWriteData(
  categoryId: number,
  values: ProductAttributeValueInput[],
) {
  const applicableCategoryIds = await resolveCategoryAndAncestorIds(categoryId);
  const applicableAttributes = await attributesRepository.findMany(applicableCategoryIds);
  const applicableById = new Map(applicableAttributes.map((attribute) => [attribute.id, attribute]));

  const submittedByAttributeId = new Map(values.map((value) => [value.attributeId, value]));

  for (const [attributeId, value] of submittedByAttributeId) {
    const attribute = applicableById.get(attributeId);
    if (!attribute) {
      throw new ApiError(
        400,
        `მითითებული მახასიათებელი (#${attributeId}) არ ეკუთვნის ამ კატეგორიას`,
      );
    }

    if (attribute.valueType === "SELECT") {
      if (value.optionId == null) {
        throw new ApiError(400, `"${attribute.nameKa}" საჭიროებს არჩეულ მნიშვნელობას`);
      }
      const option = await attributeOptionsRepository.findById(value.optionId);
      if (!option || option.attributeId !== attributeId) {
        throw new ApiError(400, `მითითებული მნიშვნელობა არ ეკუთვნის "${attribute.nameKa}"-ს`);
      }
    }
  }

  for (const attribute of applicableAttributes) {
    if (!attribute.required) continue;
    const value = submittedByAttributeId.get(attribute.id);
    const hasValue =
      value != null &&
      (value.valueText != null ||
        value.valueNumber != null ||
        value.valueBoolean != null ||
        value.optionId != null);
    if (!hasValue) {
      throw new ApiError(400, `"${attribute.nameKa}" სავალდებულო ველია`);
    }
  }

  return values
    .filter((value) => applicableById.has(value.attributeId))
    .map((value) => ({
      attributeId: value.attributeId,
      valueText: value.valueText ?? null,
      valueNumber: value.valueNumber ?? null,
      valueBoolean: value.valueBoolean ?? null,
      optionId: value.optionId ?? null,
    }));
}

// A product is compatible with a vehicle if either: it has an explicit
// ProductFitment row for it, or one of its ProductFitmentRule rows matches —
// an "ALL" rule (always), a "CATEGORY" rule whose category is the vehicle's
// own category or one of its ancestors, or a "SPEC" rule whose field/value
// matches the vehicle's actual spec. Resolved once here (where the vehicle's
// own category/specs are looked up) into a plain Prisma.ProductWhereInput,
// so products.repository.ts can just AND it in without knowing any of this.
// Exported for reuse by getProductDetail below — filters a product's
// buyTogether companions down to ones compatible with the customer's
// selected vehicle, instead of always showing every configured companion.
export async function buildVehicleCompatibilityWhere(
  vehicleCatalogId: number,
): Promise<Prisma.ProductWhereInput> {
  const vehicle = await vehicleCatalogRepository.findById(vehicleCatalogId);
  if (!vehicle) {
    // Unknown id — fall back to the exact-match clause alone, which simply
    // (and correctly) returns nothing.
    return { fitments: { some: { vehicleCatalogId } } };
  }

  const ancestorCategoryIds = await resolveCategoryAndAncestorIds(vehicle.model.category.id);

  const specFieldValues: { field: VehicleSpecField; value: number | null }[] = [
    { field: "FUEL_TYPE", value: vehicle.fuelType?.id ?? null },
    { field: "TRANSMISSION_TYPE", value: vehicle.transmissionType?.id ?? null },
    { field: "COOLING_TYPE", value: vehicle.coolingType?.id ?? null },
    { field: "FINAL_DRIVE_TYPE", value: vehicle.finalDriveType?.id ?? null },
    { field: "DRIVE_TYPE", value: vehicle.driveType?.id ?? null },
    { field: "START_TYPE", value: vehicle.startType?.id ?? null },
    { field: "POWERTRAIN_TYPE", value: vehicle.powertrainType?.id ?? null },
  ];
  const specOr = specFieldValues
    .filter((entry): entry is { field: VehicleSpecField; value: number } => entry.value != null)
    .map((entry) => ({
      type: "SPEC" as const,
      specField: entry.field,
      specLookupItemId: entry.value,
    }));

  return {
    OR: [
      { fitments: { some: { vehicleCatalogId } } },
      { fitmentRules: { some: { type: "ALL" } } },
      { fitmentRules: { some: { type: "CATEGORY", categoryId: { in: ancestorCategoryIds } } } },
      ...(specOr.length > 0 ? [{ fitmentRules: { some: { OR: specOr } } }] : []),
    ],
  };
}

// Homepage sliders (on-sale/popular) hit these with the exact same
// {onSale, limit} or {limit} shape on essentially every guest visit — the
// ranking barely changes minute-to-minute, so a TTL cache (see lib/cache.ts)
// avoids re-running the ranking query and its follow-up findByIds on every
// single homepage load. 5 minutes, not a few seconds: this is a
// low-traffic, regional (Georgian motorcycle-market) storefront, so a short
// TTL would mostly just expire between visits and rarely get reused — a
// longer window actually gets hit, at the cost of a new discount/order
// taking up to 5 minutes to show up on the homepage (product/cart/checkout
// pages are unaffected — they never read from this cache).
const HOMEPAGE_CACHE_TTL_MS = 5 * 60_000;

// True only for the homepage's specific "on-sale, nothing else" access
// pattern (see getOnSaleProductsFromServer on the frontend) — every other
// filter combination (category browsing, search, admin panel) still goes
// straight to the DB, since caching a near-infinite combination of filters
// wouldn't pay for itself.
function isCacheableOnSaleQuery(query: ProductListQuery): boolean {
  return (
    query.onSale === true &&
    query.categoryId == null &&
    query.vehicleCatalogId == null &&
    query.search == null &&
    query.brandIds == null &&
    query.priceMin == null &&
    query.priceMax == null &&
    query.attributeFilters == null &&
    query.adminFilters == null
  );
}

export async function listProducts(query: ProductListQuery) {
  const cacheKey = isCacheableOnSaleQuery(query) ? `products:onSale:${query.limit ?? "all"}` : null;
  if (cacheKey) {
    const cached = cache.get<ReturnType<typeof toResponse>[]>(cacheKey);
    if (cached) return cached;
  }

  const categoryIds =
    query.categoryId != null ? await resolveCategoryAndDescendantIds(query.categoryId) : undefined;
  const vehicleCompatibilityWhere =
    query.vehicleCatalogId != null
      ? await buildVehicleCompatibilityWhere(query.vehicleCatalogId)
      : undefined;
  // Resolved to a ranked id list first (see findSearchRankedIds) so
  // buildWhere can AND it together with every other structured filter, the
  // same way buildVehicleCompatibilityWhere's output is threaded through.
  const searchIds =
    query.search != null
      ? await productsRepository.findSearchRankedIds(query.search, query.limit)
      : undefined;

  const rows = await productsRepository.findMany({
    categoryIds,
    vehicleCompatibilityWhere,
    searchIds,
    brandIds: query.brandIds,
    priceMin: query.priceMin,
    priceMax: query.priceMax,
    onSale: query.onSale,
    attributeFilters: query.attributeFilters,
    adminFilters: query.adminFilters,
    limit: query.limit,
  });

  let result: ReturnType<typeof toResponse>[];
  if (searchIds == null) {
    result = rows.map(toResponse);
  } else {
    // findMany's `id: {in: searchIds}` doesn't preserve searchIds' relevance
    // order — restore it, then apply the limit here (findMany skipped `take`
    // for this case; see its comment).
    const rankById = new Map(searchIds.map((id, index) => [id, index]));
    const ranked = [...rows].sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0));
    result = (query.limit != null ? ranked.slice(0, query.limit) : ranked).map(toResponse);
  }

  if (cacheKey) cache.set(cacheKey, result, HOMEPAGE_CACHE_TTL_MS);
  return result;
}

// Homepage "popular products" slider — see
// productsRepository.findPopularProductIds for the ranking logic; this just
// re-fetches full card rows for the ranked ids and preserves their order
// (findByIds/`in` queries don't). Cached the same way and for the same
// reason as listProducts' on-sale path above.
export async function listPopularProducts(limit: number) {
  const cacheKey = `products:popular:${limit}`;
  const cached = cache.get<ReturnType<typeof toResponse>[]>(cacheKey);
  if (cached) return cached;

  const rankedIds = await productsRepository.findPopularProductIds(limit);
  if (rankedIds.length === 0) return [];

  const rows = await productsRepository.findByIds(rankedIds);
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const result = rankedIds
    .map((id) => rowById.get(id))
    .filter((row): row is NonNullable<typeof row> => row != null)
    .map((row) => toResponse(row));

  cache.set(cacheKey, result, HOMEPAGE_CACHE_TTL_MS);
  return result;
}

// Checkout's "check compatibility" widget — same buildVehicleCompatibilityWhere
// + findIdsMatchingWhere combo getProductDetail already uses for buyTogether
// companions, just exposed directly for an arbitrary caller-supplied id set
// (the shopper's cart) instead of one product's fixed companion list.
export async function checkProductsCompatibility(productIds: number[], vehicleCatalogId: number) {
  const where = await buildVehicleCompatibilityWhere(vehicleCatalogId);
  const rows = await productsRepository.findIdsMatchingWhere(productIds, where);
  return rows.map((row) => row.id);
}

export async function getProduct(id: number) {
  const row = await productsRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function getProductDetail(slug: string, vehicleCatalogId?: number) {
  const row = await productsRepository.findDetailBySlug(slug);
  if (!row) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }

  await productsRepository.incrementViewCount(row.id);

  const response = await toDetailResponse(row);
  if (vehicleCatalogId == null || response.buyTogether.length === 0) {
    return response;
  }

  // Narrow buyTogether companions down to ones actually compatible with the
  // shopper's selected vehicle — a companion attached to the anchor can
  // still legitimately not fit every vehicle the anchor itself fits (e.g. an
  // oil that fits every sport bike, paired with a filter that only fits
  // some of them).
  const compatWhere = await buildVehicleCompatibilityWhere(vehicleCatalogId);
  const compatibleIds = await productsRepository.findIdsMatchingWhere(
    response.buyTogether.map((product) => product.id),
    compatWhere,
  );
  const compatibleIdSet = new Set(compatibleIds.map((row) => row.id));
  return {
    ...response,
    buyTogether: response.buyTogether.filter((product) => compatibleIdSet.has(product.id)),
  };
}

// Admin "full view" counterpart to getProductDetail — unlike that
// customer-facing version, this never increments viewCount (an admin
// opening the detail modal isn't a real customer visit) and never narrows
// buyTogether by vehicle compatibility (the admin manages the full
// configured list, not a shopper's filtered view of it).
export async function getProductDetailAdmin(id: number) {
  const row = await productsRepository.findDetailById(id);
  if (!row) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }

  const variantIds = row.variants.map((variant) => variant.id);
  const [response, sales] = await Promise.all([
    toDetailResponse(row),
    productsRepository.findSalesSummary(variantIds),
  ]);

  return { ...response, sales };
}

export async function createProduct(input: CreateProductInput) {
  await assertCategoryExists(input.categoryId);
  if (input.productBrandId != null) {
    await assertProductBrandExists(input.productBrandId);
  }
  await assertSlugAvailable(input.slug);

  const attributeWriteData = await buildAttributeValueWriteData(
    input.categoryId,
    input.attributeValues ?? [],
  );

  const row = await productsRepository.create({
    categoryId: input.categoryId,
    productBrandId: input.productBrandId ?? null,
    nameKa: input.name.ka,
    nameEn: input.name.en,
    nameRu: input.name.ru,
    slug: input.slug,
    metaTitle: input.metaTitle ?? null,
    metaDescription: input.metaDescription ?? null,
    descriptionKa: input.descriptionKa ?? null,
    descriptionEn: input.descriptionEn ?? null,
    descriptionRu: input.descriptionRu ?? null,
  });

  if (attributeWriteData.length > 0) {
    await productsRepository.replaceAttributeValues(row.id, attributeWriteData);
  }

  return getProduct(row.id);
}

export async function updateProduct(id: number, input: UpdateProductInput) {
  const existing = await productsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }

  if (input.categoryId !== undefined) {
    await assertCategoryExists(input.categoryId);
  }
  if (input.productBrandId) {
    await assertProductBrandExists(input.productBrandId);
  }
  if (input.slug !== undefined && input.slug !== existing.slug) {
    await assertSlugAvailable(input.slug, id);
  }

  const effectiveCategoryId = input.categoryId ?? existing.category.id;

  if (input.attributeValues !== undefined) {
    const attributeWriteData = await buildAttributeValueWriteData(
      effectiveCategoryId,
      input.attributeValues,
    );
    await productsRepository.replaceAttributeValues(id, attributeWriteData);
  }

  await productsRepository.update(id, {
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.productBrandId !== undefined ? { productBrandId: input.productBrandId } : {}),
    ...(input.name !== undefined
      ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
      : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
    ...(input.metaDescription !== undefined ? { metaDescription: input.metaDescription } : {}),
    ...(input.descriptionKa !== undefined ? { descriptionKa: input.descriptionKa } : {}),
    ...(input.descriptionEn !== undefined ? { descriptionEn: input.descriptionEn } : {}),
    ...(input.descriptionRu !== undefined ? { descriptionRu: input.descriptionRu } : {}),
  });

  return getProduct(id);
}

export async function setProductImage(id: number, file: Express.Multer.File) {
  const existing = await productsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }

  const imageUrl = await saveUploadedImage("products", file);
  const row = await productsRepository.updateImage(id, imageUrl);
  return toResponse(row);
}

export async function deleteProduct(id: number) {
  const existing = await productsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }

  try {
    await productsRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        400,
        "ეს პროდუქტი გამოიყენება სხვა ჩანაწერებში (მაგ. გასაყიდი ვარიანტები), ჯერ წაშალეთ დამოკიდებული ჩანაწერები",
      );
    }
    throw error;
  }
}

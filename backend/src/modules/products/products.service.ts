import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { saveUploadedImage } from "../../lib/storage.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { productBrandsRepository } from "../product-brands/product-brands.repository.js";
import { attributesRepository } from "../attributes/attributes.repository.js";
import { attributeOptionsRepository } from "../attribute-options/attribute-options.repository.js";
import { resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { resolveCategoryAndDescendantIds } from "../categories/categories.service.js";
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

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };

type AttributeValueRow = {
  attributeId: number;
  attribute: { id: number; nameKa: string; nameEn: string; nameRu: string; valueType: string };
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
  const now = new Date();
  const active = discounts.find((discount) => discount.startDate <= now && now <= discount.endDate);
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
  productBrand: NamedRefRow | null;
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
  attributeValues: AttributeValueRow[];
  variants: VariantSummaryRow[];
  createdAt: Date;
  updatedAt: Date;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function toResponse(row: ProductRow) {
  return {
    id: row.id,
    category: toNamedRef(row.category),
    productBrand: row.productBrand ? toNamedRef(row.productBrand) : null,
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
    totalStock: row.variants.reduce((sum, v) => sum + v.stockQuantity, 0),
    activeDiscount: findCardActiveDiscount(row.variants),
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

type FitmentRow = {
  vehicleCatalog: {
    id: number;
    brand: NamedRefRow;
    model: NamedRefRow;
  };
};

type ProductDetailRow = ProductRow & {
  variants: VariantDetailRow[];
  fitments: FitmentRow[];
};

function findActiveDiscount(discounts: DiscountRow[]) {
  const now = new Date();
  return (
    discounts.find((discount) => discount.startDate <= now && now <= discount.endDate) ?? null
  );
}

function toVariantDetailResponse(row: VariantDetailRow) {
  const activeDiscount = findActiveDiscount(row.discounts);

  return {
    id: row.id,
    sku: row.sku,
    price: Number(row.price),
    stockQuantity: row.stockQuantity,
    isActive: row.isActive,
    size: row.size,
    color: row.color,
    condition: row.condition,
    status: row.status,
    images: row.images.map(toImageResponse),
    discounts: row.discounts.map(toDiscountResponse),
    activeDiscount: activeDiscount ? toDiscountResponse(activeDiscount) : null,
  };
}

function toDetailResponse(row: ProductDetailRow) {
  return {
    ...toResponse(row),
    variants: row.variants.map(toVariantDetailResponse),
    fitments: row.fitments.map((fitment) => ({
      id: fitment.vehicleCatalog.id,
      brand: toNamedRef(fitment.vehicleCatalog.brand),
      model: toNamedRef(fitment.vehicleCatalog.model),
    })),
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

export async function listProducts(query: ProductListQuery) {
  const categoryIds =
    query.categoryId != null ? await resolveCategoryAndDescendantIds(query.categoryId) : undefined;
  const rows = await productsRepository.findMany({
    categoryIds,
    search: query.search,
    brandIds: query.brandIds,
    priceMin: query.priceMin,
    priceMax: query.priceMax,
    attributeFilters: query.attributeFilters,
  });
  return rows.map(toResponse);
}

export async function getProduct(id: number) {
  const row = await productsRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function getProductDetail(slug: string) {
  const row = await productsRepository.findDetailBySlug(slug);
  if (!row) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }
  return toDetailResponse(row);
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

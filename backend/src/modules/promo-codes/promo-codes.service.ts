import { ApiError } from "../../lib/ApiError.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { productBrandsRepository } from "../product-brands/product-brands.repository.js";
import { attributesRepository } from "../attributes/attributes.repository.js";
import { attributeOptionsRepository } from "../attribute-options/attribute-options.repository.js";
import { brandsRepository } from "../brands/brands.repository.js";
import { modelsRepository } from "../models/models.repository.js";
import { resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getSpecFieldDefinition } from "../vehicle-category-filters/vehicle-spec-fields.registry.js";
import { productVariantsRepository } from "../product-variants/product-variants.repository.js";
import { productsRepository } from "../products/products.repository.js";
import { vehicleListingRepository } from "../vehicle-listing/vehicle-listing.repository.js";
import { promoCodesRepository } from "./promo-codes.repository.js";
import type {
  CreatePromoCodeInput,
  ListPromoCodesQuery,
  UpdatePromoCodeInput,
  VehicleSpecFieldInput,
} from "./promo-codes.schema.js";
import type { CartItemType, PromoCodeDomain, VehicleSpecField } from "../../generated/prisma/index.js";

// Every vehicle (transport) category lives under this one root — same
// convention ProductFitmentRule's assertIsVehicleCategory relies on.
const VEHICLE_ROOT_CATEGORY_SLUG = "transport";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type BrandModelRefRow = { id: number; name: string; slug: string };
type AttributeRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string };
type AttributeOptionRefRow = { id: number; key: string; labelKa: string; labelEn: string; labelRu: string };
type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };

type PromoCodeRow = {
  id: number;
  code: string;
  domain: PromoCodeDomain;
  category: NamedRefRow | null;
  productBrand: BrandModelRefRow | null;
  attribute: AttributeRefRow | null;
  attributeOption: AttributeOptionRefRow | null;
  brand: BrandModelRefRow | null;
  model: BrandModelRefRow | null;
  specField: VehicleSpecField | null;
  specLookupItemId: number | null;
  discountPercent: { toString(): string };
  usageLimit: number | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function computeStatus(row: { isActive: boolean; startDate: Date; endDate: Date }) {
  if (!row.isActive) return "DISABLED" as const;
  const now = new Date();
  if (now < row.startDate) return "SCHEDULED" as const;
  if (now > row.endDate) return "EXPIRED" as const;
  return "ACTIVE" as const;
}

async function toResponse(row: PromoCodeRow) {
  let specFieldLabel = null;
  let specValue: LookupRow | null = null;

  if (row.specField && row.specLookupItemId != null) {
    const definition = getSpecFieldDefinition(row.specField);
    specFieldLabel = { ka: definition.nameKa, en: definition.nameEn, ru: definition.nameRu };
    if (definition.lookupType) {
      specValue = await lookupsRepository.findById(
        getLookupDelegate(definition.lookupType),
        row.specLookupItemId,
      );
    }
  }

  return {
    id: row.id,
    code: row.code,
    domain: row.domain,
    category: row.category ? toNamedRef(row.category) : null,
    productBrand: row.productBrand,
    attribute: row.attribute
      ? { id: row.attribute.id, name: { ka: row.attribute.nameKa, en: row.attribute.nameEn, ru: row.attribute.nameRu } }
      : null,
    attributeOption: row.attributeOption
      ? {
          id: row.attributeOption.id,
          key: row.attributeOption.key,
          label: {
            ka: row.attributeOption.labelKa,
            en: row.attributeOption.labelEn,
            ru: row.attributeOption.labelRu,
          },
        }
      : null,
    brand: row.brand,
    model: row.model,
    specField: row.specField,
    specFieldLabel,
    specValue,
    discountPercent: Number(row.discountPercent),
    usageLimit: row.usageLimit,
    usageCount: await promoCodesRepository.countUsage(row.id),
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    computedStatus: computeStatus(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertCategoryExists(categoryId: number) {
  const category = await categoriesRepository.findById(categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }
}

async function assertIsVehicleCategory(categoryId: number) {
  await assertCategoryExists(categoryId);
  const ancestorIds = await resolveCategoryAndAncestorIds(categoryId);
  const rootId = ancestorIds[ancestorIds.length - 1];
  const root = await categoriesRepository.findById(rootId);
  if (root?.slug !== VEHICLE_ROOT_CATEGORY_SLUG) {
    throw new ApiError(400, "მითითებული კატეგორია ტრანსპორტის კატეგორია არ არის");
  }
}

async function assertProductBrandExists(productBrandId: number) {
  const brand = await productBrandsRepository.findById(productBrandId);
  if (!brand) {
    throw new ApiError(400, "მითითებული ბრენდი არ არსებობს");
  }
}

async function assertAttributeOptionValid(categoryId: number, attributeId: number, attributeOptionId: number) {
  const applicableCategoryIds = await resolveCategoryAndAncestorIds(categoryId);
  const attribute = await attributesRepository.findById(attributeId);
  if (!attribute || !applicableCategoryIds.includes(attribute.category.id)) {
    throw new ApiError(400, "მითითებული მახასიათებელი ამ კატეგორიას არ ეკუთვნის");
  }
  if (attribute.valueType !== "SELECT") {
    throw new ApiError(400, "პრომოკოდისთვის მხოლოდ SELECT ტიპის მახასიათებელია შესაძლებელი");
  }

  const option = await attributeOptionsRepository.findById(attributeOptionId);
  if (!option || option.attributeId !== attributeId) {
    throw new ApiError(400, "მითითებული მნიშვნელობა არ ეკუთვნის ამ მახასიათებელს");
  }
}

async function assertBrandExists(brandId: number) {
  const brand = await brandsRepository.findById(brandId);
  if (!brand) {
    throw new ApiError(400, "მითითებული მარკა არ არსებობს");
  }
}

async function assertModelValid(modelId: number, brandId: number | null | undefined) {
  const model = await modelsRepository.findById(modelId);
  if (!model) {
    throw new ApiError(400, "მითითებული მოდელი არ არსებობს");
  }
  if (brandId != null && model.brandId !== brandId) {
    throw new ApiError(400, "მითითებული მოდელი ამ მარკას არ ეკუთვნის");
  }
}

async function assertSpecValueExists(specField: VehicleSpecFieldInput, specLookupItemId: number) {
  const definition = getSpecFieldDefinition(specField);
  if (definition.kind !== "LOOKUP" || !definition.lookupType) {
    throw new ApiError(400, "მითითებული მახასიათებელი ამ ტიპის კოდისთვის არ გამოდგება");
  }

  const item = await lookupsRepository.findById(getLookupDelegate(definition.lookupType), specLookupItemId);
  if (!item) {
    throw new ApiError(400, "მითითებული მნიშვნელობა არ არსებობს");
  }
}

async function assertCodeAvailable(code: string, excludeId?: number) {
  const existing = await promoCodesRepository.findByCode(code);
  if (existing && existing.id !== excludeId) {
    throw new ApiError(409, "ეს კოდი უკვე გამოყენებულია");
  }
}

export async function listPromoCodes(query: ListPromoCodesQuery) {
  const rows = await promoCodesRepository.findMany({
    domain: query.domain,
    categoryId: query.categoryId,
    search: query.search,
  });
  const items = await Promise.all(rows.map(toResponse));
  if (!query.status) return items;
  return items.filter((item) =>
    query.status === "active" ? item.computedStatus === "ACTIVE" : item.computedStatus !== "ACTIVE",
  );
}

export async function getPromoCode(id: number) {
  const row = await promoCodesRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "პრომოკოდი ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createPromoCode(input: CreatePromoCodeInput) {
  const code = input.code.trim().toUpperCase();
  await assertCodeAvailable(code);

  if (input.categoryId != null) {
    if (input.domain === "VEHICLE") {
      await assertIsVehicleCategory(input.categoryId);
    } else {
      await assertCategoryExists(input.categoryId);
    }
  }
  if (input.domain === "PRODUCT") {
    if (input.productBrandId != null) {
      await assertProductBrandExists(input.productBrandId);
    }
    if (input.attributeId != null && input.attributeOptionId != null) {
      await assertAttributeOptionValid(input.categoryId!, input.attributeId, input.attributeOptionId);
    }
  } else {
    if (input.brandId != null) {
      await assertBrandExists(input.brandId);
    }
    if (input.modelId != null) {
      await assertModelValid(input.modelId, input.brandId);
    }
    if (input.specField != null && input.specLookupItemId != null) {
      await assertSpecValueExists(input.specField, input.specLookupItemId);
    }
  }

  const row = await promoCodesRepository.create({
    code,
    domain: input.domain,
    categoryId: input.categoryId ?? null,
    productBrandId: input.domain === "PRODUCT" ? (input.productBrandId ?? null) : null,
    attributeId: input.domain === "PRODUCT" ? (input.attributeId ?? null) : null,
    attributeOptionId: input.domain === "PRODUCT" ? (input.attributeOptionId ?? null) : null,
    brandId: input.domain === "VEHICLE" ? (input.brandId ?? null) : null,
    modelId: input.domain === "VEHICLE" ? (input.modelId ?? null) : null,
    specField: input.domain === "VEHICLE" ? (input.specField ?? null) : null,
    specLookupItemId: input.domain === "VEHICLE" ? (input.specLookupItemId ?? null) : null,
    discountPercent: input.discountPercent,
    usageLimit: input.usageLimit ?? null,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    isActive: input.isActive ?? true,
  });
  return toResponse(row);
}

export async function updatePromoCode(id: number, input: UpdatePromoCodeInput) {
  const existing = await promoCodesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "პრომოკოდი ვერ მოიძებნა");
  }

  const code = input.code !== undefined ? input.code.trim().toUpperCase() : undefined;
  if (code !== undefined) {
    await assertCodeAvailable(code, id);
  }

  const effectiveCategoryId = input.categoryId !== undefined ? input.categoryId : existing.category?.id ?? null;
  if (input.categoryId !== undefined && input.categoryId != null) {
    if (existing.domain === "VEHICLE") {
      await assertIsVehicleCategory(input.categoryId);
    } else {
      await assertCategoryExists(input.categoryId);
    }
  }

  if (existing.domain === "PRODUCT") {
    if (input.productBrandId) {
      await assertProductBrandExists(input.productBrandId);
    }
    const effectiveAttributeId = input.attributeId !== undefined ? input.attributeId : existing.attribute?.id ?? null;
    const effectiveAttributeOptionId =
      input.attributeOptionId !== undefined ? input.attributeOptionId : existing.attributeOption?.id ?? null;
    if (effectiveAttributeId != null && effectiveAttributeOptionId != null) {
      if (effectiveCategoryId == null) {
        throw new ApiError(400, "მახასიათებლის მითითებისთვის საჭიროა კატეგორიაც");
      }
      await assertAttributeOptionValid(effectiveCategoryId, effectiveAttributeId, effectiveAttributeOptionId);
    }
  } else {
    if (input.brandId) {
      await assertBrandExists(input.brandId);
    }
    const effectiveBrandId = input.brandId !== undefined ? input.brandId : existing.brand?.id ?? null;
    const effectiveModelId = input.modelId !== undefined ? input.modelId : existing.model?.id ?? null;
    if (effectiveModelId != null) {
      await assertModelValid(effectiveModelId, effectiveBrandId);
    }
    const effectiveSpecField = input.specField !== undefined ? input.specField : (existing.specField as VehicleSpecFieldInput | null);
    const effectiveSpecLookupItemId =
      input.specLookupItemId !== undefined ? input.specLookupItemId : existing.specLookupItemId;
    if (effectiveSpecField != null && effectiveSpecLookupItemId != null) {
      await assertSpecValueExists(effectiveSpecField, effectiveSpecLookupItemId);
    }
  }

  const effectiveStart = input.startDate ? new Date(input.startDate) : existing.startDate;
  const effectiveEnd = input.endDate ? new Date(input.endDate) : existing.endDate;
  if (effectiveStart >= effectiveEnd) {
    throw new ApiError(400, "დაწყების თარიღი დასრულების თარიღზე ადრე უნდა იყოს");
  }

  const row = await promoCodesRepository.update(id, {
    ...(code !== undefined ? { code } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.productBrandId !== undefined ? { productBrandId: input.productBrandId } : {}),
    ...(input.attributeId !== undefined ? { attributeId: input.attributeId } : {}),
    ...(input.attributeOptionId !== undefined ? { attributeOptionId: input.attributeOptionId } : {}),
    ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
    ...(input.modelId !== undefined ? { modelId: input.modelId } : {}),
    ...(input.specField !== undefined ? { specField: input.specField } : {}),
    ...(input.specLookupItemId !== undefined ? { specLookupItemId: input.specLookupItemId } : {}),
    ...(input.discountPercent !== undefined ? { discountPercent: input.discountPercent } : {}),
    ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit } : {}),
    ...(input.startDate !== undefined ? { startDate: new Date(input.startDate) } : {}),
    ...(input.endDate !== undefined ? { endDate: new Date(input.endDate) } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });
  return toResponse(row);
}

export async function deletePromoCode(id: number) {
  const existing = await promoCodesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "პრომოკოდი ვერ მოიძებნა");
  }

  await promoCodesRepository.delete(id);
}

export type PromoCodeMatchItem = {
  itemType: CartItemType;
  productVariantId?: number | null;
  vehicleListingId?: number | null;
};

export type PromoCodeMatch = {
  id: number;
  code: string;
  discountPercent: number;
  matchedKeys: Set<string>;
};

export function promoCodeItemKey(item: PromoCodeMatchItem): string {
  return item.itemType === "PRODUCT_VARIANT"
    ? `PRODUCT_VARIANT:${item.productVariantId}`
    : `VEHICLE_LISTING:${item.vehicleListingId}`;
}

// Checkout's counterpart to the admin CRUD above — resolves a
// customer-entered code against the caller's cart contents. Unlike
// ProductVariantDiscount/VehicleListingDiscount, a PromoCode's scope is
// declarative (see promo-code.prisma), so this walks each candidate item's
// category/brand/attribute (or model/spec) chain to decide whether the
// code's rule matches it — nothing materialized to just look up.
export async function resolvePromoCodeForItems(
  code: string,
  items: PromoCodeMatchItem[],
  userId: number,
): Promise<PromoCodeMatch> {
  const promo = await promoCodesRepository.findByCode(code.trim().toUpperCase());
  if (!promo || !promo.isActive) {
    throw new ApiError(400, "პრომო კოდი არასწორია ან არააქტიურია", "PROMO_CODE_INVALID");
  }

  const now = new Date();
  if (now < promo.startDate || now > promo.endDate) {
    throw new ApiError(400, "პრომო კოდის მოქმედების ვადა ამოწურულია", "PROMO_CODE_EXPIRED");
  }

  if (await promoCodesRepository.hasUserUsed(promo.id, userId)) {
    throw new ApiError(400, "თქვენ უკვე გამოიყენეთ ეს პრომო კოდი", "PROMO_CODE_ALREADY_USED");
  }

  if (promo.usageLimit != null) {
    const usageCount = await promoCodesRepository.countUsage(promo.id);
    if (usageCount >= promo.usageLimit) {
      throw new ApiError(400, "პრომო კოდის გამოყენების ლიმიტი ამოწურულია", "PROMO_CODE_USAGE_LIMIT_REACHED");
    }
  }

  const categoryIds = promo.categoryId != null ? await resolveCategoryAndAncestorIds(promo.categoryId) : null;
  const matchedKeys = new Set<string>();

  if (promo.domain === "PRODUCT") {
    for (const item of items) {
      if (item.itemType !== "PRODUCT_VARIANT" || !item.productVariantId) continue;

      const variant = await productVariantsRepository.findById(item.productVariantId);
      if (!variant) continue;
      const product = await productsRepository.findById(variant.product.id);
      if (!product) continue;

      if (categoryIds && !categoryIds.includes(product.categoryId)) continue;
      if (promo.productBrandId != null && product.productBrandId !== promo.productBrandId) continue;
      if (promo.attributeId != null && promo.attributeOptionId != null) {
        const hasOption = product.attributeValues.some(
          (value) => value.attributeId === promo.attributeId && value.optionId === promo.attributeOptionId,
        );
        if (!hasOption) continue;
      }

      matchedKeys.add(promoCodeItemKey(item));
    }
  } else {
    for (const item of items) {
      if (item.itemType !== "VEHICLE_LISTING" || !item.vehicleListingId) continue;

      const listing = await vehicleListingRepository.findById(item.vehicleListingId);
      if (!listing) continue;
      const catalog = listing.vehicleCatalog;

      if (categoryIds && !categoryIds.includes(catalog.model.category.id)) continue;
      if (promo.brandId != null && catalog.brandId !== promo.brandId) continue;
      if (promo.modelId != null && catalog.modelId !== promo.modelId) continue;
      if (promo.specField != null && promo.specLookupItemId != null) {
        const { column } = getSpecFieldDefinition(promo.specField);
        const actualValue = (catalog as unknown as Record<string, number | null>)[column];
        if (actualValue !== promo.specLookupItemId) continue;
      }

      matchedKeys.add(promoCodeItemKey(item));
    }
  }

  if (matchedKeys.size === 0) {
    throw new ApiError(400, "პრომო კოდი ამ კალათის არცერთ ნივთს არ ეხება", "PROMO_CODE_NOT_APPLICABLE");
  }

  return {
    id: promo.id,
    code: promo.code,
    discountPercent: Number(promo.discountPercent),
    matchedKeys,
  };
}

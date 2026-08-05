import { ApiError } from "../../lib/ApiError.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { resolveCategoryAndDescendantIds } from "../categories/categories.service.js";
import {
  toDiscountResponse,
  type DiscountRow,
} from "../product-variant-discounts/product-variant-discounts.service.js";
import { bulkProductDiscountsRepository } from "./bulk-product-discounts.repository.js";
import type {
  BulkApplyProductDiscountsInput,
  BulkDiscountCandidatesQuery,
  ListProductDiscountHistoryQuery,
} from "./bulk-product-discounts.schema.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };

type CandidateAttributeValueRow = {
  attributeId: number;
  attribute: { id: number; nameKa: string; nameEn: string; nameRu: string; valueType: string };
  valueText: string | null;
  valueNumber: { toString(): string } | null;
  valueBoolean: boolean | null;
  option: { id: number; key: string; labelKa: string; labelEn: string; labelRu: string } | null;
};

type CandidateVariantRow = {
  id: number;
  sku: string | null;
  price: { toString(): string };
  size: LookupRow | null;
  color: LookupRow | null;
  discounts: { discountPercent: { toString(): string } | null; startDate: Date; endDate: Date }[];
};

type CandidateProductRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  productBrand: NamedRefRow | null;
  attributeValues: CandidateAttributeValueRow[];
  variants: CandidateVariantRow[];
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function findActiveDiscount(discounts: CandidateVariantRow["discounts"]) {
  const now = new Date();
  return discounts.find((discount) => discount.startDate <= now && now <= discount.endDate) ?? null;
}

// One row per variant, product info denormalized onto each — the bulk
// discount table is variant-level (price/size/color live on the variant,
// not the product), so this flattens rather than nesting variants under
// products the way the regular product list/detail responses do.
function toCandidateRows(product: CandidateProductRow) {
  const attributeValues = product.attributeValues.map((value) => ({
    attributeId: value.attributeId,
    attributeName: { ka: value.attribute.nameKa, en: value.attribute.nameEn, ru: value.attribute.nameRu },
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
  }));

  return product.variants.map((variant) => {
    const activeDiscount = findActiveDiscount(variant.discounts);
    return {
      variantId: variant.id,
      productId: product.id,
      productName: { ka: product.nameKa, en: product.nameEn, ru: product.nameRu },
      productSlug: product.slug,
      brand: product.productBrand ? toNamedRef(product.productBrand) : null,
      attributeValues,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      price: Number(variant.price),
      activeDiscount: activeDiscount
        ? {
            discountPercent: activeDiscount.discountPercent != null ? Number(activeDiscount.discountPercent) : null,
            startDate: activeDiscount.startDate,
            endDate: activeDiscount.endDate,
          }
        : null,
    };
  });
}

export async function listBulkDiscountCandidates(query: BulkDiscountCandidatesQuery) {
  const category = await categoriesRepository.findById(query.categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }

  const categoryIds = await resolveCategoryAndDescendantIds(query.categoryId);
  const products = await bulkProductDiscountsRepository.findCandidateProducts(categoryIds);
  return products.flatMap(toCandidateRows);
}

function applyPercentDiscount(price: number, percent: number): number {
  return Math.round(price * (1 - percent / 100) * 100) / 100;
}

export async function applyBulkProductDiscounts(input: BulkApplyProductDiscountsInput) {
  const variants = await bulkProductDiscountsRepository.findVariantsForDiscount(input.variantIds);
  if (variants.length === 0) {
    throw new ApiError(400, "მითითებული ვარიანტები ვერ მოიძებნა");
  }

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  const rows = variants.map((variant) => ({
    productVariantId: variant.id,
    discountPrice: applyPercentDiscount(Number(variant.price), input.discountPercent),
    discountPercent: input.discountPercent,
    startDate,
    endDate,
  }));

  const created = await bulkProductDiscountsRepository.bulkCreateDiscounts(rows);
  return created.map((row) => toDiscountResponse(row as DiscountRow));
}

type DiscountHistoryRow = {
  id: number;
  discountPrice: { toString(): string };
  discountPercent: { toString(): string } | null;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  productVariant: {
    id: number;
    sku: string | null;
    price: { toString(): string };
    size: LookupRow | null;
    color: LookupRow | null;
    product: {
      id: number;
      nameKa: string;
      nameEn: string;
      nameRu: string;
      slug: string;
      productBrand: NamedRefRow | null;
    };
  };
};

function computeDiscountStatus(row: { startDate: Date; endDate: Date }) {
  const now = new Date();
  if (now < row.startDate) return "SCHEDULED" as const;
  if (now > row.endDate) return "EXPIRED" as const;
  return "ACTIVE" as const;
}

function toDiscountHistoryRow(row: DiscountHistoryRow) {
  return {
    id: row.id,
    variantId: row.productVariant.id,
    productId: row.productVariant.product.id,
    productName: {
      ka: row.productVariant.product.nameKa,
      en: row.productVariant.product.nameEn,
      ru: row.productVariant.product.nameRu,
    },
    productSlug: row.productVariant.product.slug,
    brand: row.productVariant.product.productBrand ? toNamedRef(row.productVariant.product.productBrand) : null,
    sku: row.productVariant.sku,
    size: row.productVariant.size,
    color: row.productVariant.color,
    price: Number(row.productVariant.price),
    discountPrice: Number(row.discountPrice),
    discountPercent: row.discountPercent != null ? Number(row.discountPercent) : null,
    startDate: row.startDate,
    endDate: row.endDate,
    computedStatus: computeDiscountStatus(row),
    createdAt: row.createdAt,
  };
}

export async function listProductDiscountHistory(query: ListProductDiscountHistoryQuery) {
  const rows = await bulkProductDiscountsRepository.findAllDiscounts(query.search);
  const items = rows.map(toDiscountHistoryRow);
  if (!query.status) return items;
  return items.filter((item) =>
    query.status === "active" ? item.computedStatus === "ACTIVE" : item.computedStatus !== "ACTIVE",
  );
}

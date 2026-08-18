import { apiClient } from "./client";
import type { LocalizedString } from "./categories";
import type { BrandModelRef, NamedRef } from "./vehicle-catalog";
import type { AttributeValueType } from "./attributes";
import type { LookupItem } from "./lookups";
import type { ProductVariantImage } from "./product-variant-images";
import type { ProductVariantDiscount } from "./product-variant-discounts";
import type { AdminFilterEntry } from "./admin-filters";
import type { ProductFitmentRuleType } from "./product-fitment-rules";
import type { VehicleSpecField } from "./vehicle-category-filters";

export type ProductAttributeValue = {
  attributeId: number;
  attributeName: LocalizedString;
  valueType: AttributeValueType;
  unit: { id: number; name: LocalizedString; abbreviation: LocalizedString } | null;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  option: { id: number; key: string; label: LocalizedString } | null;
};

export type ProductAttributeValueInput = {
  attributeId: number;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  optionId?: number | null;
};

export type Product = {
  id: number;
  category: NamedRef;
  productBrand: NamedRef | null;
  name: LocalizedString;
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  descriptionKa: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  imageUrl: string | null;
  attributeValues: ProductAttributeValue[];
  variantCount: number;
  minPrice: number | null;
  totalStock: number;
  activeDiscount: { price: number; discountPrice: number } | null;
  // Detail-page view counter — an admin-facing interest signal, separate
  // from the Order-based "most sold" ranking used by the popular-products
  // homepage slider (see listPopularProducts).
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  categoryId: number;
  productBrandId?: number | null;
  name: LocalizedString;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  descriptionKa?: string | null;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
  attributeValues?: ProductAttributeValueInput[];
};

export type ProductVariantDetail = {
  id: number;
  sku: string | null;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  size: LookupItem | null;
  color: LookupItem | null;
  condition: LookupItem | null;
  status: LookupItem | null;
  images: ProductVariantImage[];
  discounts: ProductVariantDiscount[];
  // Narrower than a full ProductVariantDiscount — may be derived from a
  // rule-based bulk discount (no real DB row of its own). Only
  // discountPrice is ever read; the crossed-out original price always comes
  // from the variant's own `price`.
  activeDiscount: { discountPrice: number } | null;
};

export type CompatibleVehicle = {
  id: number;
  brand: BrandModelRef;
  model: BrandModelRef;
};

// Summarized, not enumerated — an "all vehicles" rule would otherwise mean
// listing hundreds of catalog rows on the product page.
export type ProductFitmentRuleSummary = {
  id: number;
  type: ProductFitmentRuleType;
  category: NamedRef | null;
  specField: VehicleSpecField | null;
  specFieldLabel: LocalizedString | null;
  specValue: LookupItem | null;
};

export type ProductDetail = Product & {
  variants: ProductVariantDetail[];
  fitments: CompatibleVehicle[];
  fitmentRules: ProductFitmentRuleSummary[];
  buyTogether: Product[];
};

export type ProductSaleOrder = {
  orderId: number;
  orderCode: string;
  createdAt: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  lineTotal: number;
  status: string;
};

export type ProductSalesSummary = {
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
  recentOrders: ProductSaleOrder[];
};

// Admin-only detail — same as ProductDetail plus sales history, returned by
// the admin "full view" endpoint (see getProductDetailAdmin below).
export type ProductDetailAdmin = ProductDetail & {
  sales: ProductSalesSummary;
};

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const { data } = await apiClient.get<{ item: ProductDetail }>(`/products/by-slug/${slug}`);
  return data.item;
}

export type ProductAttributeFilters = {
  selectFilters?: { attributeId: number; optionIds: number[] }[];
  booleanAttributeIds?: number[];
  numberRanges?: { attributeId: number; min?: number; max?: number }[];
};

export type ProductListFilters = {
  categoryId?: number;
  // "My vehicle" filter — narrows to products with a fitment for this
  // catalog entry, used both by the shop's MY_VEHICLE category filter and
  // the garage's cross-category "compatible products" page.
  vehicleCatalogId?: number;
  search?: string;
  brandIds?: number[];
  priceMin?: number;
  priceMax?: number;
  // "Sale" page (homepage CTA slide + /sale) — narrows to products with an
  // active discount right now, across every category.
  onSale?: boolean;
  attributeFilters?: ProductAttributeFilters;
  adminFilters?: AdminFilterEntry[];
  // Homepage product sliders cap how many products they pull.
  limit?: number;
};

function isEmptyAttributeFilters(filters: ProductAttributeFilters): boolean {
  return (
    !filters.selectFilters?.length &&
    !filters.booleanAttributeIds?.length &&
    !filters.numberRanges?.length
  );
}

export async function listProducts(filters: ProductListFilters = {}): Promise<Product[]> {
  const { data } = await apiClient.get<{ items: Product[] }>("/products", {
    params: {
      categoryId: filters.categoryId,
      vehicleCatalogId: filters.vehicleCatalogId,
      search: filters.search || undefined,
      brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      onSale: filters.onSale || undefined,
      attributeFilters:
        filters.attributeFilters && !isEmptyAttributeFilters(filters.attributeFilters)
          ? JSON.stringify(filters.attributeFilters)
          : undefined,
      adminFilters: filters.adminFilters?.length ? JSON.stringify(filters.adminFilters) : undefined,
      limit: filters.limit,
    },
  });
  return data.items;
}

// Homepage "popular products" slider — ranked by total sold quantity
// (Order/OrderItem), not a filter on the regular /products list.
export async function listPopularProducts(limit?: number): Promise<Product[]> {
  const { data } = await apiClient.get<{ items: Product[] }>("/products/popular", {
    params: { limit },
  });
  return data.items;
}

export async function getProduct(id: number): Promise<Product> {
  const { data } = await apiClient.get<{ item: Product }>(`/products/${id}`);
  return data.item;
}

// Admin "full view" counterpart to getProductBySlug — same ProductDetail
// shape, but doesn't count as a customer view and isn't narrowed by any
// vehicle-compatibility filter (see the backend's getProductDetailAdmin).
export async function getProductDetailAdmin(id: number): Promise<ProductDetailAdmin> {
  const { data } = await apiClient.get<{ item: ProductDetailAdmin }>(`/products/${id}/detail`);
  return data.item;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await apiClient.post<{ item: Product }>("/products", input);
  return data.item;
}

export async function updateProduct(id: number, input: Partial<ProductInput>): Promise<Product> {
  const { data } = await apiClient.patch<{ item: Product }>(`/products/${id}`, input);
  return data.item;
}

export async function deleteProduct(id: number): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function uploadProductImage(id: number, file: File): Promise<Product> {
  const formData = new FormData();
  formData.append("image", file);

  const { data } = await apiClient.post<{ item: Product }>(`/products/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.item;
}

// Checkout's "check compatibility" widget — which of these product ids fit
// the given vehicle.
export async function checkProductsCompatibility(
  productIds: number[],
  vehicleCatalogId: number,
): Promise<number[]> {
  const { data } = await apiClient.post<{ compatibleProductIds: number[] }>(
    "/products/check-compatibility",
    { productIds, vehicleCatalogId },
  );
  return data.compatibleProductIds;
}

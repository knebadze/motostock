import { apiClient } from "./client";
import type { components } from "./generated/schema";
import type { AdminFilterEntry } from "./admin-filters";

// Response/input shapes are generated from the backend's OpenAPI document
// (npm run api:types → generated/schema.d.ts), not hand-written — a backend
// schema change now surfaces here as a type error instead of drifting
// silently. Names stay the same, so consumers didn't change.
type Schemas = components["schemas"];

// What every product list endpoint returns (shop, homepage sliders,
// recommendations, wishlist, recently viewed, buy-together, admin list) —
// Product minus descriptions, SEO meta and attributeValues. The full
// Product is only returned by the single-product endpoints.
export type ProductListItem = Schemas["ProductCard"];
export type Product = Schemas["Product"];
export type ProductAttributeValue = Product["attributeValues"][number];

export type ProductInput = Schemas["CreateProductInput"];
export type ProductAttributeValueInput = NonNullable<ProductInput["attributeValues"]>[number];

export type ProductDetail = Schemas["ProductDetail"];
export type ProductVariantDetail = ProductDetail["variants"][number];
export type CompatibleVehicle = ProductDetail["fitments"][number];
// Summarized, not enumerated — an "all vehicles" rule would otherwise mean
// listing hundreds of catalog rows on the product page.
export type ProductFitmentRuleSummary = ProductDetail["fitmentRules"][number];

// Admin-only detail — same as ProductDetail plus sales history, returned by
// the admin "full view" endpoint (see getProductDetailAdmin below).
export type ProductDetailAdmin = Schemas["ProductDetailAdmin"];
export type ProductSalesSummary = ProductDetailAdmin["sales"];
export type ProductSaleOrder = ProductSalesSummary["recentOrders"][number];

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
  // Cross-category "browse everything" page's category-checkbox facet (see
  // ShopAllProductsPage.tsx) — an arbitrary exact-match set, unlike
  // categoryId above (which also matches its descendants). Send one or the
  // other, not both.
  categoryIds?: number[];
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
  // Narrows to products discounted as part of one BulkDiscountEvent — set by
  // /shop's own ?eventId= URL param (see the homepage hero-slider's
  // event-scoped DISCOUNT slides).
  bulkDiscountEventId?: number;
  // Homepage "New Arrivals" mixed slider — a plain admin-curated flag, not
  // computed from any discount/popularity data.
  featured?: boolean;
  attributeFilters?: ProductAttributeFilters;
  adminFilters?: AdminFilterEntry[];
  // Homepage product sliders cap how many products they pull.
  limit?: number;
  // Server-side pagination (see listProductsPage) — used by ProductsManager
  // (with adminFilters) and by the storefront shop pages (with sortBy).
  page?: number;
  pageSize?: number;
  // Storefront shop page sort — only meaningful alongside page/pageSize.
  sortBy?: "newest" | "price-asc" | "price-desc";
};

function isEmptyAttributeFilters(filters: ProductAttributeFilters): boolean {
  return (
    !filters.selectFilters?.length &&
    !filters.booleanAttributeIds?.length &&
    !filters.numberRanges?.length
  );
}

type ProductListResponse = { items: ProductListItem[]; total: number; page: number; pageSize: number };

async function fetchProductsList(filters: ProductListFilters): Promise<ProductListResponse> {
  const { data } = await apiClient.get<ProductListResponse>("/products", {
    params: {
      categoryId: filters.categoryId,
      categoryIds: filters.categoryIds?.length ? filters.categoryIds : undefined,
      vehicleCatalogId: filters.vehicleCatalogId,
      search: filters.search || undefined,
      brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      onSale: filters.onSale || undefined,
      bulkDiscountEventId: filters.bulkDiscountEventId,
      featured: filters.featured || undefined,
      attributeFilters:
        filters.attributeFilters && !isEmptyAttributeFilters(filters.attributeFilters)
          ? JSON.stringify(filters.attributeFilters)
          : undefined,
      // Must distinguish "not an admin call" (key omitted — storefront
      // callers never pass this) from "admin call, no filters picked" (an
      // empty array) — the backend uses the same signal to serve a lean
      // admin-list projection instead of the storefront's heavier
      // card-rendering one (see products.service.ts's listProducts), so an
      // admin call with zero filters selected must still send `[]`, not
      // omit the param entirely the way `.length ? ... : undefined` would.
      adminFilters: filters.adminFilters !== undefined ? JSON.stringify(filters.adminFilters) : undefined,
      limit: filters.limit,
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
    },
  });
  return data;
}

export async function listProducts(filters: ProductListFilters = {}): Promise<ProductListItem[]> {
  const { items } = await fetchProductsList(filters);
  return items;
}

// Paginated variant of listProducts — same endpoint/filters, but returns the
// full server-pagination envelope (total/page/pageSize) instead of a bare
// array. Used by ProductsManager.tsx (admin, via adminFilters) and by the
// storefront shop pages (via page/pageSize) — every OTHER caller keeps using
// listProducts above, unaffected (page/pageSize simply omitted, so the
// backend returns its old unbounded/`limit`-only shape).
export async function listProductsPage(
  filters: ProductListFilters = {},
): Promise<ProductListResponse> {
  return fetchProductsList(filters);
}

// Homepage "popular products" slider — ranked by total sold quantity
// (Order/OrderItem), not a filter on the regular /products list.
export async function listPopularProducts(limit?: number): Promise<ProductListItem[]> {
  const { data } = await apiClient.get<{ items: ProductListItem[] }>("/products/popular", {
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

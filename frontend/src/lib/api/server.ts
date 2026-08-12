import "server-only";
import { cookies } from "next/headers";
import { apiClient } from "./client";
import type { User } from "./auth";
import type { Category } from "./categories";
import type { Settings, VinDecodeProvider } from "./settings";
import type { Brand } from "./brands";
import type { Model } from "./models";
import type { LookupItem } from "./lookups";
import type { LookupTypeSlug } from "@/config/lookup-types";
import type { VehicleCatalogEntry } from "./vehicle-catalog";
import type { VehicleListing } from "./vehicle-listings";
import type { Attribute } from "./attributes";
import type { CategoryFilter } from "./category-filters";
import type { Address } from "./addresses";
import type { GarageVehicle } from "./garage";
import type { VehicleCategoryFilter } from "./vehicle-category-filters";
import type { ProductBrand } from "./product-brands";
import type { Unit } from "./units";
import type { Product, ProductDetail } from "./products";
import type { FinaSyncRun } from "./fina-sync";
import type { AdminUser } from "./users";
import type { HeroSlide } from "./hero-slides";
import type { Bank, PublicBank } from "./banks";
import type { HomepageSection } from "./homepage-sections";
import type { PromoCode, PromoCodeDomain } from "./promo-codes";
import type { WishlistItem } from "./wishlist";
import type { CompareItem } from "./compare";
import type { Cart } from "./cart";
import type { AdminOrderSummary, Order, OrderSummary } from "./orders";
import type { DashboardStats } from "./dashboard";
import type { CompatibilityItem } from "./compatibility";
import type { AdminProductBuyTogether } from "./product-buy-together";
import type { CompanyInfo, WeekDay } from "./company-info";
import type { Terms } from "./terms";
import type { EmailTemplate } from "./email-templates";
import type { OrderStatusItem } from "./order-statuses";
import type { NewsletterSubscriber, NewsletterSubscriberCounts } from "./newsletter";
import type { NewsletterCampaign } from "./newsletter-campaigns";

async function authHeaders() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return cookieHeader ? { Cookie: cookieHeader } : undefined;
}

export async function getCurrentUserFromServer(): Promise<User | null> {
  const headers = await authHeaders();
  if (!headers) return null;

  try {
    const { data } = await apiClient.get<{ user: User }>("/users/me", { headers });
    return data.user;
  } catch {
    return null;
  }
}

export async function getCategoriesFromServer(): Promise<Category[]> {
  // Public endpoint (guest storefront navigation reads this too) — unlike
  // the admin-only getXFromServer helpers below, this must not bail out just
  // because there's no admin session cookie.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ categories: Category[] }>("/categories", {
      headers,
    });
    return data.categories;
  } catch {
    return [];
  }
}

export async function getSettingsFromServer(): Promise<Settings> {
  const headers = await authHeaders();
  const fallback: Settings = {
    useCloudStorage: false,
    vinDecodeEnabled: false,
    vinDecodeProvider: "nhtsa",
    guestWishlistEnabled: false,
    guestCartEnabled: false,
    promoStackingEnabled: false,
    deliveryTbilisiPrice: 0,
    deliveryTbilisiTime: "",
    deliveryRegionsPrice: 0,
    deliveryRegionsTime: "",
    deliveryExpressPrice: 0,
    deliveryExpressTime: "",
  };
  if (!headers) return fallback;

  try {
    const { data } = await apiClient.get<{ settings: Settings }>("/settings", {
      headers,
    });
    return data.settings;
  } catch {
    return fallback;
  }
}

export async function getVinDecodeStatusFromServer(): Promise<{
  enabled: boolean;
  provider: VinDecodeProvider;
}> {
  const fallback = { enabled: false, provider: "nhtsa" as VinDecodeProvider };

  try {
    const { data } = await apiClient.get<{ enabled: boolean; provider: VinDecodeProvider }>(
      "/settings/vin-decode-status",
    );
    return data;
  } catch {
    return fallback;
  }
}

export async function getUsersFromServer(): Promise<AdminUser[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ users: AdminUser[] }>("/users", { headers });
    return data.users;
  } catch {
    return [];
  }
}

const WEEK_DAYS: WeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

// Public endpoint (the Footer and Contact page read this on every guest page
// load too) — unlike the admin-only getXFromServer helpers, this must not
// bail out just because there's no admin session cookie (see
// getCategoriesFromServer's identical reasoning above).
export async function getCompanyInfoFromServer(): Promise<CompanyInfo> {
  const headers = await authHeaders();
  const fallback: CompanyInfo = {
    id: 0,
    name: "",
    logoUrl: null,
    city: null,
    street: null,
    phone: null,
    email: null,
    facebookUrl: null,
    instagramUrl: null,
    youtubeUrl: null,
    tiktokUrl: null,
    latitude: null,
    longitude: null,
    workingHours: WEEK_DAYS.map((dayOfWeek) => ({
      dayOfWeek,
      isClosed: true,
      openTime: null,
      closeTime: null,
    })),
    updatedAt: new Date(0).toISOString(),
  };

  try {
    const { data } = await apiClient.get<{ companyInfo: CompanyInfo }>("/company-info", { headers });
    return data.companyInfo;
  } catch {
    return fallback;
  }
}

export async function getTermsFromServer(): Promise<Terms> {
  // Public endpoint (the guest /terms page reads this) — must not bail out
  // just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  const headers = await authHeaders();
  const fallback: Terms = { id: 0, content: { ka: "", en: "", ru: "" }, updatedAt: new Date(0).toISOString() };

  try {
    const { data } = await apiClient.get<{ terms: Terms }>("/terms", { headers });
    return data.terms;
  } catch {
    return fallback;
  }
}

export async function getEmailTemplatesFromServer(): Promise<EmailTemplate[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: EmailTemplate[] }>("/email-templates", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getOrderStatusesFromServer(): Promise<OrderStatusItem[]> {
  // Public endpoint (same reasoning as getCategoriesFromServer) — ordered
  // by sortOrder server-side, so callers don't need to re-sort.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: OrderStatusItem[] }>("/order-statuses", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getFinaSyncRunsFromServer(): Promise<FinaSyncRun[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ runs: FinaSyncRun[] }>("/fina-sync/runs", {
      headers,
    });
    return data.runs;
  } catch {
    return [];
  }
}

export async function getBrandsFromServer(): Promise<Brand[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ brands: Brand[] }>("/brands", { headers });
    return data.brands;
  } catch {
    return [];
  }
}

export async function getModelsFromServer(): Promise<Model[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ models: Model[] }>("/models", { headers });
    return data.models;
  } catch {
    return [];
  }
}

export async function getLookupItemsFromServer(type: LookupTypeSlug): Promise<LookupItem[]> {
  // Public endpoint (guest-facing forms, e.g. the address form's city
  // dropdown, read this too) — must not bail out just because there's no
  // admin session cookie, same fix as getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: LookupItem[] }>(`/lookups/${type}`, {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getVehicleCatalogFromServer(): Promise<VehicleCatalogEntry[]> {
  // Public endpoint (garage "pick from catalog" flow reads this too) — must
  // not bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: VehicleCatalogEntry[] }>("/vehicle-catalog", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getVehicleCatalogEntryFromServer(
  id: number,
): Promise<VehicleCatalogEntry | null> {
  // Public endpoint (the garage's "compatible products" page reads this by
  // id) — must not bail out just because there's no admin session cookie,
  // same fix as getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ item: VehicleCatalogEntry }>(`/vehicle-catalog/${id}`, {
      headers,
    });
    return data.item;
  } catch {
    return null;
  }
}

export async function getVehicleListingsFromServer(categoryId?: number): Promise<VehicleListing[]> {
  // Public endpoint (guest shop page reads this too) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: VehicleListing[] }>("/vehicle-listings", {
      headers,
      params: categoryId ? { categoryId } : undefined,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getVehicleListingFromServer(id: number): Promise<VehicleListing | null> {
  // Public endpoint (guest vehicle detail page) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ item: VehicleListing }>(`/vehicle-listings/${id}`, {
      headers,
    });
    return data.item;
  } catch {
    return null;
  }
}

// Homepage "discounted vehicles" slider.
export async function getOnSaleVehicleListingsFromServer(limit: number): Promise<VehicleListing[]> {
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: VehicleListing[] }>("/vehicle-listings", {
      headers,
      params: { onSale: true, limit },
    });
    return data.items;
  } catch {
    return [];
  }
}

// Homepage "popular vehicles" slider.
export async function getPopularVehicleListingsFromServer(limit: number): Promise<VehicleListing[]> {
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: VehicleListing[] }>("/vehicle-listings/popular", {
      headers,
      params: { limit },
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getCategoryFiltersFromServer(categoryId: number): Promise<CategoryFilter[]> {
  // Public endpoint (guest shop filter sidebar reads this too) — must not
  // bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: CategoryFilter[] }>("/category-filters", {
      headers,
      params: { categoryId },
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getVehicleCategoryFiltersFromServer(
  categoryId: number,
): Promise<VehicleCategoryFilter[]> {
  // Public endpoint (guest shop filter sidebar reads this too) — must not
  // bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: VehicleCategoryFilter[] }>(
      "/vehicle-category-filters",
      { headers, params: { categoryId } },
    );
    return data.items;
  } catch {
    return [];
  }
}

export async function getMyAddressesFromServer(): Promise<Address[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ addresses: Address[] }>("/users/me/addresses", {
      headers,
    });
    return data.addresses;
  } catch {
    return [];
  }
}

export async function getMyGarageFromServer(): Promise<GarageVehicle[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: GarageVehicle[] }>("/users/me/garage", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getMyWishlistFromServer(): Promise<WishlistItem[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: WishlistItem[] }>("/users/me/wishlist", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

// Lightweight — just the header badge count, not the full wishlist with
// every nested product/vehicle detail. Same reasoning as
// getMyCartCountFromServer.
export async function getMyWishlistCountFromServer(): Promise<number> {
  const headers = await authHeaders();
  if (!headers) return 0;

  try {
    const { data } = await apiClient.get<{ count: number }>("/users/me/wishlist/count", { headers });
    return data.count;
  } catch {
    return 0;
  }
}

export async function getMyCompareFromServer(): Promise<CompareItem[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: CompareItem[] }>("/users/me/compare", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

// Lightweight — just the header badge count, not the full comparison list
// with every nested product/vehicle detail. Same reasoning as
// getMyCartCountFromServer.
export async function getMyCompareCountFromServer(): Promise<number> {
  const headers = await authHeaders();
  if (!headers) return 0;

  try {
    const { data } = await apiClient.get<{ count: number }>("/users/me/compare/count", { headers });
    return data.count;
  } catch {
    return 0;
  }
}

const EMPTY_CART: Cart = { items: [], subtotal: 0, itemCount: 0 };

export async function getMyCartFromServer(): Promise<Cart> {
  const headers = await authHeaders();
  if (!headers) return EMPTY_CART;

  try {
    const { data } = await apiClient.get<Cart>("/users/me/cart", { headers });
    return data;
  } catch {
    return EMPTY_CART;
  }
}

// Lightweight — just the header badge count, not the full cart with every
// nested product/vehicle detail. Safe to call on every page load (see
// (guest)/layout.tsx), unlike getMyCartFromServer.
export async function getMyCartCountFromServer(): Promise<number> {
  const headers = await authHeaders();
  if (!headers) return 0;

  try {
    const { data } = await apiClient.get<{ count: number }>("/users/me/cart/count", { headers });
    return data.count;
  } catch {
    return 0;
  }
}

export async function getMyOrdersFromServer(): Promise<OrderSummary[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ orders: OrderSummary[] }>("/orders/me", { headers });
    return data.orders;
  } catch {
    return [];
  }
}

export async function getMyOrderFromServer(id: number): Promise<Order | null> {
  const headers = await authHeaders();
  if (!headers) return null;

  try {
    const { data } = await apiClient.get<{ order: Order }>(`/orders/me/${id}`, { headers });
    return data.order;
  } catch {
    return null;
  }
}

export async function getOrdersFromServer(): Promise<AdminOrderSummary[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ orders: AdminOrderSummary[] }>("/orders", { headers });
    return data.orders;
  } catch {
    return [];
  }
}

const EMPTY_DASHBOARD_STATS: DashboardStats = {
  counts: {
    totalOrders: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalVehicleListings: 0,
    activePromoCodes: 0,
    lowStockCount: 0,
  },
  revenueLast30Days: 0,
  ordersByStatus: [],
  recentOrders: [],
  lowStockItems: [],
};

export async function getDashboardStatsFromServer(): Promise<DashboardStats> {
  const headers = await authHeaders();
  if (!headers) return EMPTY_DASHBOARD_STATS;

  try {
    const { data } = await apiClient.get<DashboardStats>("/dashboard/stats", { headers });
    return data;
  } catch {
    return EMPTY_DASHBOARD_STATS;
  }
}

export async function getCompatibilityFromServer(): Promise<CompatibilityItem[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: CompatibilityItem[] }>("/compatibility", { headers });
    return data.items;
  } catch {
    return [];
  }
}

export async function getProductBuyTogetherFromServer(): Promise<AdminProductBuyTogether[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: AdminProductBuyTogether[] }>("/product-buy-together", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getAttributesFromServer(): Promise<Attribute[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: Attribute[] }>("/attributes", { headers });
    return data.items;
  } catch {
    return [];
  }
}

export async function getProductBrandsFromServer(): Promise<ProductBrand[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: ProductBrand[] }>("/product-brands", { headers });
    return data.items;
  } catch {
    return [];
  }
}

export async function getUnitsFromServer(): Promise<Unit[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: Unit[] }>("/units", { headers });
    return data.items;
  } catch {
    return [];
  }
}

export async function getProductsFromServer(
  categoryId?: number,
  vehicleCatalogId?: number,
): Promise<Product[]> {
  // Public endpoint (guest shop page reads this too) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: Product[] }>("/products", {
      headers,
      params: { categoryId: categoryId || undefined, vehicleCatalogId: vehicleCatalogId || undefined },
    });
    return data.items;
  } catch {
    return [];
  }
}

// Homepage "discounted products" slider.
export async function getOnSaleProductsFromServer(limit: number): Promise<Product[]> {
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: Product[] }>("/products", {
      headers,
      params: { onSale: true, limit },
    });
    return data.items;
  } catch {
    return [];
  }
}

// Homepage "popular products" slider.
export async function getPopularProductsFromServer(limit: number): Promise<Product[]> {
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: Product[] }>("/products/popular", {
      headers,
      params: { limit },
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getProductDetailFromServer(
  slug: string,
  vehicleCatalogId?: string,
): Promise<ProductDetail | null> {
  // Public endpoint (guest product view page) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ item: ProductDetail }>(`/products/by-slug/${slug}`, {
      headers,
      params: { vehicleCatalogId: vehicleCatalogId || undefined },
    });
    return data.item;
  } catch {
    return null;
  }
}

// Product detail page's "similar products" section — replaces the old
// naive "everything else in the same category" slice with the algorithmic,
// fitment-overlap-ranked list (see recommendations.service.ts).
export async function getSimilarProductsFromServer(
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<Product[]> {
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: Product[] }>(
      `/products/${productId}/recommendations/similar`,
      { headers, params: { vehicleCatalogId: vehicleCatalogId || undefined, limit } },
    );
    return data.items;
  } catch {
    return [];
  }
}

// Product detail page's algorithmic "frequently bought together" — a
// fallback shown when the admin hasn't curated a buyTogether list for this
// product (see FrequentlyBoughtTogether.tsx).
export async function getFrequentlyBoughtTogetherFromServer(
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<Product[]> {
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: Product[] }>(
      `/products/${productId}/recommendations/frequently-bought-together`,
      { headers, params: { vehicleCatalogId: vehicleCatalogId || undefined, limit } },
    );
    return data.items;
  } catch {
    return [];
  }
}

// Product detail page's algorithmic "customers who viewed this also
// viewed" — view-based co-occurrence, independent of buyTogether/FBT.
export async function getViewedTogetherFromServer(
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<Product[]> {
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: Product[] }>(
      `/products/${productId}/recommendations/viewed-together`,
      { headers, params: { vehicleCatalogId: vehicleCatalogId || undefined, limit } },
    );
    return data.items;
  } catch {
    return [];
  }
}

// Homepage "recently viewed" section (RECENTLY_VIEWED) — works for guests
// too (the backend always resolves an owner, minting a guest-id cookie if
// needed), unlike getRecommendedForMeFromServer's auth-only gate.
export async function getRecentlyViewedFromServer(limit?: number): Promise<Product[]> {
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: Product[] }>("/users/me/recently-viewed", {
      headers,
      params: { limit },
    });
    return data.items;
  } catch {
    return [];
  }
}

// Homepage "popular for your vehicle" section (POPULAR_FOR_VEHICLE) — the
// caller skips this entirely when there's no SELECTED_VEHICLE_COOKIE, same
// as it does for getProductDetailFromServer's vehicleCatalogId.
export async function getPopularForVehicleFromServer(
  vehicleCatalogId: string,
  limit?: number,
): Promise<Product[]> {
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: Product[] }>("/recommendations/popular-for-vehicle", {
      headers,
      params: { vehicleCatalogId, limit },
    });
    return data.items;
  } catch {
    return [];
  }
}

// Homepage "recommended for you" section (RECOMMENDED_FOR_YOU) — auth-gated
// like getMyGarageFromServer; guests never even reach the API call.
export async function getRecommendedForMeFromServer(limit?: number): Promise<Product[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: Product[] }>("/recommendations/for-me", {
      headers,
      params: { limit },
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getProductFromServer(id: number): Promise<Product | null> {
  const headers = await authHeaders();
  if (!headers) return null;

  try {
    const { data } = await apiClient.get<{ item: Product }>(`/products/${id}`, { headers });
    return data.item;
  } catch {
    return null;
  }
}

export async function getShopProductsFromServer(filters: {
  categoryId?: number;
  brandIds?: number[];
  onSale?: boolean;
}): Promise<Product[]> {
  // Public endpoint (the /shop page) — must not bail out just because there
  // is no admin session cookie, same fix as getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: Product[] }>("/products", {
      headers,
      params: {
        categoryId: filters.categoryId,
        brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
        onSale: filters.onSale || undefined,
      },
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getHeroSlidesFromServer(): Promise<HeroSlide[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: HeroSlide[] }>("/hero-slides", { headers });
    return data.items;
  } catch {
    return [];
  }
}

export async function getPromoCodesFromServer(domain: PromoCodeDomain): Promise<PromoCode[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: PromoCode[] }>("/promo-codes", {
      headers,
      params: { domain },
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getPublicHeroSlidesFromServer(): Promise<HeroSlide[]> {
  // Public endpoint (the homepage hero) — must not bail out just because
  // there's no admin session cookie, same fix as getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: HeroSlide[] }>("/hero-slides/public", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getBanksFromServer(): Promise<Bank[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: Bank[] }>("/banks", { headers });
    return data.items;
  } catch {
    return [];
  }
}

export async function getPublicBanksFromServer(): Promise<PublicBank[]> {
  // Public endpoint (the checkout page's bank picker) — must not bail out
  // just because there's no admin session cookie, same fix as
  // getPublicHeroSlidesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: PublicBank[] }>("/banks/public", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getHomepageSectionsFromServer(): Promise<HomepageSection[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: HomepageSection[] }>("/homepage-sections", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getPublicHomepageSectionsFromServer(): Promise<HomepageSection[]> {
  // Public endpoint (the homepage reads this) — must not bail out just
  // because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  const headers = await authHeaders();

  try {
    const { data } = await apiClient.get<{ items: HomepageSection[] }>(
      "/homepage-sections/public",
      { headers },
    );
    return data.items;
  } catch {
    return [];
  }
}

export async function getNewsletterCampaignsFromServer(): Promise<NewsletterCampaign[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: NewsletterCampaign[] }>("/newsletter-campaigns", {
      headers,
    });
    return data.items;
  } catch {
    return [];
  }
}

export async function getNewsletterSubscribersFromServer(): Promise<NewsletterSubscriber[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  try {
    const { data } = await apiClient.get<{ items: NewsletterSubscriber[] }>(
      "/newsletter/subscribers",
      { headers },
    );
    return data.items;
  } catch {
    return [];
  }
}

export async function getNewsletterSubscriberCountsFromServer(): Promise<NewsletterSubscriberCounts> {
  const headers = await authHeaders();
  const empty = { pending: 0, confirmed: 0, unsubscribed: 0 };
  if (!headers) return empty;

  try {
    const { data } = await apiClient.get<NewsletterSubscriberCounts>(
      "/newsletter/subscribers/counts",
      { headers },
    );
    return data;
  } catch {
    return empty;
  }
}

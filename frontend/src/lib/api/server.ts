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
import type { TeamMember } from "./team-members";
import type { Bank, PublicBank } from "./banks";
import type { ServiceType } from "./service-types";
import type { HomepageSection } from "./homepage-sections";
import type { PromoCode, PromoCodeDomain } from "./promo-codes";
import type { WishlistItem } from "./wishlist";
import type { CompareItem } from "./compare";
import type { Cart } from "./cart";
import type { AdminOrderSummary, Order, OrderSummary } from "./orders";
import type { DashboardStats } from "./dashboard";
import type { AnalyticsFilters, AnalyticsOverview } from "./analytics";
import type { CompatibilityItem } from "./compatibility";
import type { AdminProductBuyTogether } from "./product-buy-together";
import type { CompanyInfo, WeekDay } from "./company-info";
import type { Terms } from "./terms";
import type { Faq } from "./faq";
import type { EmailTemplate } from "./email-templates";
import type { OrderStatusItem } from "./order-statuses";
import type { NewsletterSubscriber, NewsletterSubscriberCounts } from "./newsletter";
import type { NewsletterCampaign } from "./newsletter-campaigns";
import type { SuspiciousLoginActivity } from "./fraud";
import type { ErrorLogsPage } from "./error-logs";

async function authHeaders() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return cookieHeader ? { Cookie: cookieHeader } : undefined;
}

// Every getXFromServer() below is the same shape: forward the request
// cookie, GET a path, pull one field (or the whole body) out of the
// response, and fall back to a safe empty value on either "not logged in"
// or a request failure — a server component must never throw just because
// a fetch to the API failed. `requireAuth: true` bails out before the
// request entirely for admin/account-only data; omitted (or false) means
// the endpoint is public and should still be attempted without a session
// (see the many per-function comments below explaining *why* a given
// endpoint needs to stay public — that reasoning lives at each call site,
// not here, since it differs per endpoint).
async function fetchFromServer<TResponse, TResult>(
  path: string,
  options: {
    params?: Record<string, unknown>;
    fallback: TResult;
    extract: (data: TResponse) => TResult;
    requireAuth?: boolean;
  },
): Promise<TResult> {
  const headers = await authHeaders();
  if (options.requireAuth && !headers) return options.fallback;

  try {
    const { data } = await apiClient.get<TResponse>(path, { headers, params: options.params });
    return options.extract(data);
  } catch {
    return options.fallback;
  }
}

export async function getCurrentUserFromServer(): Promise<User | null> {
  return fetchFromServer<{ user: User }, User | null>("/users/me", {
    fallback: null,
    extract: (data) => data.user,
    requireAuth: true,
  });
}

export async function getCategoriesFromServer(): Promise<Category[]> {
  // Public endpoint (guest storefront navigation reads this too) — unlike
  // the admin-only getXFromServer helpers below, this must not bail out just
  // because there's no admin session cookie.
  return fetchFromServer<{ categories: Category[] }, Category[]>("/categories", {
    fallback: [],
    extract: (data) => data.categories,
  });
}

const SETTINGS_FALLBACK: Settings = {
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
  fraudVelocityOrderCount: 3,
  fraudVelocityWindowMinutes: 30,
  fraudNewAccountWindowHours: 24,
  fraudHighValueThreshold: 1000,
  fraudFailedLoginThreshold: 5,
  fraudFailedLoginWindowMinutes: 15,
  finaWebCustomerId: null,
  finaWebUserId: null,
};

export async function getSettingsFromServer(): Promise<Settings> {
  return fetchFromServer<{ settings: Settings }, Settings>("/settings", {
    fallback: SETTINGS_FALLBACK,
    extract: (data) => data.settings,
    requireAuth: true,
  });
}

export async function getVinDecodeStatusFromServer(): Promise<{
  enabled: boolean;
  provider: VinDecodeProvider;
}> {
  return fetchFromServer<
    { enabled: boolean; provider: VinDecodeProvider },
    { enabled: boolean; provider: VinDecodeProvider }
  >("/settings/vin-decode-status", {
    fallback: { enabled: false, provider: "nhtsa" },
    extract: (data) => data,
  });
}

export async function getUsersFromServer(): Promise<AdminUser[]> {
  return fetchFromServer<{ users: AdminUser[] }, AdminUser[]>("/users", {
    fallback: [],
    extract: (data) => data.users,
    requireAuth: true,
  });
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

const COMPANY_INFO_FALLBACK: CompanyInfo = {
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

// Public endpoint (the Footer and Contact page read this on every guest page
// load too) — unlike the admin-only getXFromServer helpers, this must not
// bail out just because there's no admin session cookie (see
// getCategoriesFromServer's identical reasoning above).
export async function getCompanyInfoFromServer(): Promise<CompanyInfo> {
  return fetchFromServer<{ companyInfo: CompanyInfo }, CompanyInfo>("/company-info", {
    fallback: COMPANY_INFO_FALLBACK,
    extract: (data) => data.companyInfo,
  });
}

export async function getTermsFromServer(): Promise<Terms> {
  // Public endpoint (the guest /terms page reads this) — must not bail out
  // just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ terms: Terms }, Terms>("/terms", {
    fallback: { id: 0, content: { ka: "", en: "", ru: "" }, updatedAt: new Date(0).toISOString() },
    extract: (data) => data.terms,
  });
}

// Public endpoint (the guest /faq page reads this) — must not bail out just
// because there's no admin session cookie, same fix as getCategoriesFromServer.
export async function getFaqListFromServer(): Promise<Faq[]> {
  return fetchFromServer<{ items: Faq[] }, Faq[]>("/faq/public", {
    fallback: [],
    extract: (data) => data.items,
  });
}

// Admin — every FAQ entry, including inactive ones (see the admin FAQ
// manager). Distinct from getFaqListFromServer's public/active-only list,
// same split as getBanksFromServer vs getPublicBanksFromServer.
export async function getAllFaqsFromServer(): Promise<Faq[]> {
  return fetchFromServer<{ items: Faq[] }, Faq[]>("/faq", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

export async function getEmailTemplatesFromServer(): Promise<EmailTemplate[]> {
  return fetchFromServer<{ items: EmailTemplate[] }, EmailTemplate[]>("/email-templates", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

export async function getOrderStatusesFromServer(): Promise<OrderStatusItem[]> {
  // Public endpoint (same reasoning as getCategoriesFromServer) — ordered
  // by sortOrder server-side, so callers don't need to re-sort.
  return fetchFromServer<{ items: OrderStatusItem[] }, OrderStatusItem[]>("/order-statuses", {
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getFinaSyncRunsFromServer(): Promise<FinaSyncRun[]> {
  return fetchFromServer<{ runs: FinaSyncRun[] }, FinaSyncRun[]>("/fina-sync/runs", {
    fallback: [],
    extract: (data) => data.runs,
    requireAuth: true,
  });
}

export async function getErrorLogsFromServer(): Promise<ErrorLogsPage> {
  return fetchFromServer<ErrorLogsPage, ErrorLogsPage>("/error-logs", {
    params: { page: 1, pageSize: 25 },
    fallback: { logs: [], total: 0, page: 1, pageSize: 25 },
    extract: (data) => data,
    requireAuth: true,
  });
}

export async function getBrandsFromServer(): Promise<Brand[]> {
  return fetchFromServer<{ brands: Brand[] }, Brand[]>("/brands", {
    fallback: [],
    extract: (data) => data.brands,
    requireAuth: true,
  });
}

export async function getModelsFromServer(): Promise<Model[]> {
  return fetchFromServer<{ models: Model[] }, Model[]>("/models", {
    fallback: [],
    extract: (data) => data.models,
    requireAuth: true,
  });
}

export async function getLookupItemsFromServer(type: LookupTypeSlug): Promise<LookupItem[]> {
  // Public endpoint (guest-facing forms, e.g. the address form's city
  // dropdown, read this too) — must not bail out just because there's no
  // admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: LookupItem[] }, LookupItem[]>(`/lookups/${type}`, {
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getVehicleCatalogFromServer(): Promise<VehicleCatalogEntry[]> {
  // Public endpoint (garage "pick from catalog" flow reads this too) — must
  // not bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ items: VehicleCatalogEntry[] }, VehicleCatalogEntry[]>("/vehicle-catalog", {
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getVehicleCatalogEntryFromServer(
  id: number,
): Promise<VehicleCatalogEntry | null> {
  // Public endpoint (the garage's "compatible products" page reads this by
  // id) — must not bail out just because there's no admin session cookie,
  // same fix as getCategoriesFromServer.
  return fetchFromServer<{ item: VehicleCatalogEntry }, VehicleCatalogEntry | null>(
    `/vehicle-catalog/${id}`,
    { fallback: null, extract: (data) => data.item },
  );
}

export async function getVehicleListingsFromServer(categoryId?: number): Promise<VehicleListing[]> {
  // Public endpoint (guest shop page reads this too) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings", {
    params: categoryId ? { categoryId } : undefined,
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getVehicleListingFromServer(id: number): Promise<VehicleListing | null> {
  // Public endpoint (guest vehicle detail page) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ item: VehicleListing }, VehicleListing | null>(
    `/vehicle-listings/${id}`,
    { fallback: null, extract: (data) => data.item },
  );
}

// Homepage "discounted vehicles" slider.
export async function getOnSaleVehicleListingsFromServer(limit: number): Promise<VehicleListing[]> {
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings", {
    params: { onSale: true, limit },
    fallback: [],
    extract: (data) => data.items,
  });
}

// Homepage "popular vehicles" slider.
export async function getPopularVehicleListingsFromServer(limit: number): Promise<VehicleListing[]> {
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings/popular", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getCategoryFiltersFromServer(categoryId: number): Promise<CategoryFilter[]> {
  // Public endpoint (guest shop filter sidebar reads this too) — must not
  // bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ items: CategoryFilter[] }, CategoryFilter[]>("/category-filters", {
    params: { categoryId },
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getVehicleCategoryFiltersFromServer(
  categoryId: number,
): Promise<VehicleCategoryFilter[]> {
  // Public endpoint (guest shop filter sidebar reads this too) — must not
  // bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ items: VehicleCategoryFilter[] }, VehicleCategoryFilter[]>(
    "/vehicle-category-filters",
    { params: { categoryId }, fallback: [], extract: (data) => data.items },
  );
}

export async function getMyAddressesFromServer(): Promise<Address[]> {
  return fetchFromServer<{ addresses: Address[] }, Address[]>("/users/me/addresses", {
    fallback: [],
    extract: (data) => data.addresses,
    requireAuth: true,
  });
}

export async function getMyGarageFromServer(): Promise<GarageVehicle[]> {
  return fetchFromServer<{ items: GarageVehicle[] }, GarageVehicle[]>("/users/me/garage", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

export async function getMyWishlistFromServer(): Promise<WishlistItem[]> {
  return fetchFromServer<{ items: WishlistItem[] }, WishlistItem[]>("/users/me/wishlist", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

// Lightweight — just the header badge count, not the full wishlist with
// every nested product/vehicle detail. Same reasoning as
// getMyCartCountFromServer.
export async function getMyWishlistCountFromServer(): Promise<number> {
  return fetchFromServer<{ count: number }, number>("/users/me/wishlist/count", {
    fallback: 0,
    extract: (data) => data.count,
    requireAuth: true,
  });
}

export async function getMyCompareFromServer(): Promise<CompareItem[]> {
  return fetchFromServer<{ items: CompareItem[] }, CompareItem[]>("/users/me/compare", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

// Lightweight — just the header badge count, not the full comparison list
// with every nested product/vehicle detail. Same reasoning as
// getMyCartCountFromServer.
export async function getMyCompareCountFromServer(): Promise<number> {
  return fetchFromServer<{ count: number }, number>("/users/me/compare/count", {
    fallback: 0,
    extract: (data) => data.count,
    requireAuth: true,
  });
}

const EMPTY_CART: Cart = { items: [], subtotal: 0, itemCount: 0 };

export async function getMyCartFromServer(): Promise<Cart> {
  return fetchFromServer<Cart, Cart>("/users/me/cart", {
    fallback: EMPTY_CART,
    extract: (data) => data,
    requireAuth: true,
  });
}

// Lightweight — just the header badge count, not the full cart with every
// nested product/vehicle detail. Safe to call on every page load (see
// (guest)/layout.tsx), unlike getMyCartFromServer.
export async function getMyCartCountFromServer(): Promise<number> {
  return fetchFromServer<{ count: number }, number>("/users/me/cart/count", {
    fallback: 0,
    extract: (data) => data.count,
    requireAuth: true,
  });
}

export async function getMyOrdersFromServer(): Promise<OrderSummary[]> {
  return fetchFromServer<{ orders: OrderSummary[] }, OrderSummary[]>("/orders/me", {
    fallback: [],
    extract: (data) => data.orders,
    requireAuth: true,
  });
}

export async function getMyOrderFromServer(id: number): Promise<Order | null> {
  return fetchFromServer<{ order: Order }, Order | null>(`/orders/me/${id}`, {
    fallback: null,
    extract: (data) => data.order,
    requireAuth: true,
  });
}

export async function getOrdersFromServer(): Promise<AdminOrderSummary[]> {
  return fetchFromServer<{ orders: AdminOrderSummary[] }, AdminOrderSummary[]>("/orders", {
    fallback: [],
    extract: (data) => data.orders,
    requireAuth: true,
  });
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
  return fetchFromServer<DashboardStats, DashboardStats>("/dashboard/stats", {
    fallback: EMPTY_DASHBOARD_STATS,
    extract: (data) => data,
    requireAuth: true,
  });
}

const EMPTY_ANALYTICS_OVERVIEW: AnalyticsOverview = {
  range: { from: "", to: "" },
  financial: { revenue: 0, orderCount: 0, cancelledCount: 0, cancellationRate: 0, lostRevenue: 0 },
  revenueSeries: [],
  ordersByStatus: [],
  topProducts: [],
  topVehicleListings: [],
  cancellations: { reasonBreakdown: [], recentOrders: [] },
};

export async function getAnalyticsFromServer(filters: AnalyticsFilters = {}): Promise<AnalyticsOverview> {
  return fetchFromServer<AnalyticsOverview, AnalyticsOverview>("/analytics/overview", {
    params: { dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined },
    fallback: EMPTY_ANALYTICS_OVERVIEW,
    extract: (data) => data,
    requireAuth: true,
  });
}

export async function getCompatibilityFromServer(): Promise<CompatibilityItem[]> {
  return fetchFromServer<{ items: CompatibilityItem[] }, CompatibilityItem[]>("/compatibility", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

export async function getProductBuyTogetherFromServer(): Promise<AdminProductBuyTogether[]> {
  return fetchFromServer<{ items: AdminProductBuyTogether[] }, AdminProductBuyTogether[]>(
    "/product-buy-together",
    { fallback: [], extract: (data) => data.items, requireAuth: true },
  );
}

export async function getAttributesFromServer(): Promise<Attribute[]> {
  return fetchFromServer<{ items: Attribute[] }, Attribute[]>("/attributes", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

export async function getProductBrandsFromServer(): Promise<ProductBrand[]> {
  return fetchFromServer<{ items: ProductBrand[] }, ProductBrand[]>("/product-brands", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

export async function getUnitsFromServer(): Promise<Unit[]> {
  return fetchFromServer<{ items: Unit[] }, Unit[]>("/units", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

export async function getProductsFromServer(
  categoryId?: number,
  vehicleCatalogId?: number,
): Promise<Product[]> {
  // Public endpoint (guest shop page reads this too) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: Product[] }, Product[]>("/products", {
    params: { categoryId: categoryId || undefined, vehicleCatalogId: vehicleCatalogId || undefined },
    fallback: [],
    extract: (data) => data.items,
  });
}

// Homepage "discounted products" slider.
export async function getOnSaleProductsFromServer(limit: number): Promise<Product[]> {
  return fetchFromServer<{ items: Product[] }, Product[]>("/products", {
    params: { onSale: true, limit },
    fallback: [],
    extract: (data) => data.items,
  });
}

// Homepage "popular products" slider.
export async function getPopularProductsFromServer(limit: number): Promise<Product[]> {
  return fetchFromServer<{ items: Product[] }, Product[]>("/products/popular", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getProductDetailFromServer(
  slug: string,
  vehicleCatalogId?: string,
): Promise<ProductDetail | null> {
  // Public endpoint (guest product view page) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ item: ProductDetail }, ProductDetail | null>(`/products/by-slug/${slug}`, {
    params: { vehicleCatalogId: vehicleCatalogId || undefined },
    fallback: null,
    extract: (data) => data.item,
  });
}

// Product detail page's "similar products" section — replaces the old
// naive "everything else in the same category" slice with the algorithmic,
// fitment-overlap-ranked list (see recommendations.service.ts).
export async function getSimilarProductsFromServer(
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<Product[]> {
  return fetchFromServer<{ items: Product[] }, Product[]>(
    `/products/${productId}/recommendations/similar`,
    {
      params: { vehicleCatalogId: vehicleCatalogId || undefined, limit },
      fallback: [],
      extract: (data) => data.items,
    },
  );
}

// Product detail page's algorithmic "frequently bought together" — a
// fallback shown when the admin hasn't curated a buyTogether list for this
// product (see FrequentlyBoughtTogether.tsx).
export async function getFrequentlyBoughtTogetherFromServer(
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<Product[]> {
  return fetchFromServer<{ items: Product[] }, Product[]>(
    `/products/${productId}/recommendations/frequently-bought-together`,
    {
      params: { vehicleCatalogId: vehicleCatalogId || undefined, limit },
      fallback: [],
      extract: (data) => data.items,
    },
  );
}

// Product detail page's algorithmic "customers who viewed this also
// viewed" — view-based co-occurrence, independent of buyTogether/FBT.
export async function getViewedTogetherFromServer(
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<Product[]> {
  return fetchFromServer<{ items: Product[] }, Product[]>(
    `/products/${productId}/recommendations/viewed-together`,
    {
      params: { vehicleCatalogId: vehicleCatalogId || undefined, limit },
      fallback: [],
      extract: (data) => data.items,
    },
  );
}

// Homepage "recently viewed" section (RECENTLY_VIEWED) — works for guests
// too (the backend always resolves an owner, minting a guest-id cookie if
// needed), unlike getRecommendedForMeFromServer's auth-only gate.
export async function getRecentlyViewedFromServer(limit?: number): Promise<Product[]> {
  return fetchFromServer<{ items: Product[] }, Product[]>("/users/me/recently-viewed", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
  });
}

// Homepage "popular for your vehicle" section (POPULAR_FOR_VEHICLE) — the
// caller skips this entirely when there's no SELECTED_VEHICLE_COOKIE, same
// as it does for getProductDetailFromServer's vehicleCatalogId.
export async function getPopularForVehicleFromServer(
  vehicleCatalogId: string,
  limit?: number,
): Promise<Product[]> {
  return fetchFromServer<{ items: Product[] }, Product[]>("/recommendations/popular-for-vehicle", {
    params: { vehicleCatalogId, limit },
    fallback: [],
    extract: (data) => data.items,
  });
}

// Homepage "recommended for you" section (RECOMMENDED_FOR_YOU) — auth-gated
// like getMyGarageFromServer; guests never even reach the API call.
export async function getRecommendedForMeFromServer(limit?: number): Promise<Product[]> {
  return fetchFromServer<{ items: Product[] }, Product[]>("/recommendations/for-me", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

export async function getProductFromServer(id: number): Promise<Product | null> {
  return fetchFromServer<{ item: Product }, Product | null>(`/products/${id}`, {
    fallback: null,
    extract: (data) => data.item,
    requireAuth: true,
  });
}

export async function getShopProductsFromServer(filters: {
  categoryId?: number;
  brandIds?: number[];
  onSale?: boolean;
}): Promise<Product[]> {
  // Public endpoint (the /shop page) — must not bail out just because there
  // is no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: Product[] }, Product[]>("/products", {
    params: {
      categoryId: filters.categoryId,
      brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
      onSale: filters.onSale || undefined,
    },
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getHeroSlidesFromServer(): Promise<HeroSlide[]> {
  return fetchFromServer<{ items: HeroSlide[] }, HeroSlide[]>("/hero-slides", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

export async function getPromoCodesFromServer(domain: PromoCodeDomain): Promise<PromoCode[]> {
  return fetchFromServer<{ items: PromoCode[] }, PromoCode[]>("/promo-codes", {
    params: { domain },
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

// Public endpoint (the homepage hero) — must not bail out just because
// there's no admin session cookie, same fix as getCategoriesFromServer.
export async function getPublicHeroSlidesFromServer(): Promise<HeroSlide[]> {
  return fetchFromServer<{ items: HeroSlide[] }, HeroSlide[]>("/hero-slides/public", {
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getTeamMembersFromServer(): Promise<TeamMember[]> {
  return fetchFromServer<{ items: TeamMember[] }, TeamMember[]>("/team-members", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

// Public endpoint (the /about page) — must not bail out just because
// there's no admin session cookie, same fix as getCategoriesFromServer.
export async function getPublicTeamMembersFromServer(): Promise<TeamMember[]> {
  return fetchFromServer<{ items: TeamMember[] }, TeamMember[]>("/team-members/public", {
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getBanksFromServer(): Promise<Bank[]> {
  return fetchFromServer<{ items: Bank[] }, Bank[]>("/banks", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

export async function getServiceTypesFromServer(): Promise<ServiceType[]> {
  return fetchFromServer<{ items: ServiceType[] }, ServiceType[]>("/service-types", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

// Public endpoint (the checkout page's bank picker) — must not bail out
// just because there's no admin session cookie, same fix as
// getPublicHeroSlidesFromServer.
export async function getPublicBanksFromServer(): Promise<PublicBank[]> {
  return fetchFromServer<{ items: PublicBank[] }, PublicBank[]>("/banks/public", {
    fallback: [],
    extract: (data) => data.items,
  });
}

export async function getHomepageSectionsFromServer(): Promise<HomepageSection[]> {
  return fetchFromServer<{ items: HomepageSection[] }, HomepageSection[]>("/homepage-sections", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
}

// Public endpoint (the homepage reads this) — must not bail out just
// because there's no admin session cookie, same fix as
// getCategoriesFromServer.
export async function getPublicHomepageSectionsFromServer(): Promise<HomepageSection[]> {
  return fetchFromServer<{ items: HomepageSection[] }, HomepageSection[]>(
    "/homepage-sections/public",
    { fallback: [], extract: (data) => data.items },
  );
}

export async function getNewsletterCampaignsFromServer(): Promise<NewsletterCampaign[]> {
  return fetchFromServer<{ items: NewsletterCampaign[] }, NewsletterCampaign[]>(
    "/newsletter-campaigns",
    { fallback: [], extract: (data) => data.items, requireAuth: true },
  );
}

export async function getNewsletterSubscribersFromServer(): Promise<NewsletterSubscriber[]> {
  return fetchFromServer<{ items: NewsletterSubscriber[] }, NewsletterSubscriber[]>(
    "/newsletter/subscribers",
    { fallback: [], extract: (data) => data.items, requireAuth: true },
  );
}

export async function getNewsletterSubscriberCountsFromServer(): Promise<NewsletterSubscriberCounts> {
  return fetchFromServer<NewsletterSubscriberCounts, NewsletterSubscriberCounts>(
    "/newsletter/subscribers/counts",
    {
      fallback: { pending: 0, confirmed: 0, unsubscribed: 0 },
      extract: (data) => data,
      requireAuth: true,
    },
  );
}

export async function getSuspiciousLoginActivityFromServer(): Promise<SuspiciousLoginActivity> {
  return fetchFromServer<SuspiciousLoginActivity, SuspiciousLoginActivity>(
    "/fraud/suspicious-logins",
    {
      fallback: { windowMinutes: 0, threshold: 0, byEmail: [], byIp: [] },
      extract: (data) => data,
      requireAuth: true,
    },
  );
}

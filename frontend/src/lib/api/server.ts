import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { apiClient, ApiRequestError } from "./client";
import type { PagedResult } from "@/components/shared/Pagination";
import type { User } from "./auth";
import type { Category } from "./categories";
import type { Settings, VinDecodeProvider } from "./settings";
import type { Brand } from "./brands";
import type { Model } from "./models";
import type { LookupItem } from "./lookups";
import type { LookupTypeSlug } from "@/config/lookup-types";
import type { VehicleCatalogEntry, VehicleCatalogPage } from "./vehicle-catalog";
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
import type { AdminUsersPage } from "./users";
import type { HeroSlide } from "./hero-slides";
import type { TeamMember } from "./team-members";
import type { Bank, PublicBank } from "./banks";
import type { ServiceType } from "./service-types";
import type { ServiceRecordsAdminPage } from "./service-records";
import type { HomepageSection } from "./homepage-sections";
import type { PromoCode, PromoCodeDomain } from "./promo-codes";
import type { WishlistItem } from "./wishlist";
import type { MyNewsletterStatus } from "./newsletter";
import type { CompareItem } from "./compare";
import type { Cart } from "./cart";
import type { AdminOrdersPage, Order, OrderSummary } from "./orders";
import type { DashboardStats } from "./dashboard";
import type { AnalyticsFilters, AnalyticsOverview } from "./analytics";
import type { CompatibilityPage } from "./compatibility";
import type { ProductBuyTogetherPage } from "./product-buy-together";
import type { CompanyInfo, WeekDay } from "./company-info";
import type { Terms } from "./terms";
import type { PrivacyPolicy } from "./privacy-policy";
import type { Faq } from "./faq";
import type { Vacancy } from "./vacancies";
import type { EmailTemplate } from "./email-templates";
import type { OrderStatusItem } from "./order-statuses";
import type { NewsletterSubscriber, NewsletterSubscriberCounts } from "./newsletter";
import type { NewsletterCampaign } from "./newsletter-campaigns";
import type { SuspiciousLoginActivity } from "./fraud";
import type { Session } from "./sessions";
import type { VisitorOverview } from "./visitors";
import type { ErrorLogsPage } from "./error-logs";
import type { ScheduledJobDefinition, ScheduledJobRunsPage } from "./scheduled-jobs";

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
  } catch (error) {
    // Server components must never throw just because the backend call
    // failed, but silently returning the fallback with zero trace makes a
    // real outage (backend down, DB pool exhausted, timeout) indistinguishable
    // from an ordinary, expected condition — every one of those previously
    // showed up as nothing at all in either the browser console/network tabs
    // (this runs server-side, during SSR) or this terminal. Logged here, not
    // in the axios interceptor, so it carries the actual request path.
    //
    // Only a missing status (the request never got an HTTP response at all —
    // connection refused, timeout, DNS) or a 5xx counts as worth surfacing.
    // Every 4xx is an ordinary application response `requireAuth` callers
    // already expect on every single guest page load (a guest has SOME
    // cookie — locale/theme/guest-id — so `authHeaders()` still sends a
    // Cookie header, and the backend correctly 401s `/users/me` etc. for
    // them) or a deliberate "not found" (e.g. getVacancyBySlugFromServer) —
    // logging those would fire on nearly every request and both drown out
    // the real signal and trip Next.js dev overlay's console.error capture.
    const status = error instanceof ApiRequestError ? error.status : undefined;
    if (status === undefined || status >= 500) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[fetchFromServer] GET ${path} failed${status ? ` (${status})` : ""}: ${message}`);
    }
    return options.fallback;
  }
}

export const getCurrentUserFromServer = cache(async (): Promise<User | null> => {
  return fetchFromServer<{ user: User }, User | null>("/users/me", {
    fallback: null,
    extract: (data) => data.user,
    requireAuth: true,
  });
});

// Backs the account-page newsletter toggle's initial render — "NOT_SUBSCRIBED"
// fallback matches what the endpoint itself returns for an account whose
// email has no NewsletterSubscriber row (see newsletter.service.ts's
// getMyStatus), so a fetch failure degrades to the same state as "never
// subscribed" rather than a distinct error state.
export const getMyNewsletterStatusFromServer = cache(async (): Promise<MyNewsletterStatus> => {
  return fetchFromServer<{ status: MyNewsletterStatus }, MyNewsletterStatus>("/newsletter/my-status", {
    fallback: "NOT_SUBSCRIBED",
    extract: (data) => data.status,
    requireAuth: true,
  });
});

export const getOAuthStatusFromServer = cache(async (): Promise<{ google: boolean; facebook: boolean }> => {
  // Public endpoint (the login/register pages read this for every guest) —
  // lets OAuthButtons hide a provider's button instead of showing one
  // that's guaranteed to fail. Fails closed: a failed fetch hides both
  // buttons rather than risk showing a broken one.
  return fetchFromServer<{ google: boolean; facebook: boolean }, { google: boolean; facebook: boolean }>(
    "/auth/oauth-status",
    { fallback: { google: false, facebook: false }, extract: (data) => data },
  );
});

export const getCategoriesFromServer = cache(async (): Promise<Category[]> => {
  // Public endpoint (guest storefront navigation reads this too) — unlike
  // the admin-only getXFromServer helpers below, this must not bail out just
  // because there's no admin session cookie.
  return fetchFromServer<{ categories: Category[] }, Category[]>("/categories", {
    fallback: [],
    extract: (data) => data.categories,
  });
});

const SETTINGS_FALLBACK: Settings = {
  useCloudStorage: false,
  vinDecodeEnabled: false,
  vinDecodeProvider: "nhtsa",
  guestWishlistEnabled: false,
  guestCartEnabled: false,
  promoStackingEnabled: false,
  whatsappSupportPhoneNumber: null,
  adminNotificationEmail: null,
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
  cartMaxQuantity: 99,
  compareMaxItems: 4,
  analyticsDefaultWindowDays: 30,
  dashboardDemandCandidateLimit: 10,
  dashboardRecentCancelledLimit: 10,
  dashboardRecentOrdersLimit: 8,
  dashboardLowStockLimit: 8,
  dashboardRecentActivityWindowDays: 30,
  lowStockThreshold: 3,
  searchResultCap: 500,
  salesSummaryLimit: 10,
  recommendationsDefaultLimit: 10,
  recommendationsCacheTtlMinutes: 5,
  recommendationOrderWeight: 2,
  recommendationWishlistWeight: 1,
  recommendationViewWeight: 0.5,
  recentlyViewedLimit: 10,
  sessionIdleTtlMinutes: 120,
  sessionAbsoluteTtlDays: 30,
  resetTokenTtlMinutes: 60,
  verificationTokenTtlHours: 24,
  guestIdCookieMaxAgeDays: 365,
  imageMaxDimensionPx: 1600,
  imageWebpQuality: 82,
  finaSyncIntervalMinutes: 15,
  homepageCacheTtlMinutes: 5,
};

export const getSettingsFromServer = cache(async (): Promise<Settings> => {
  return fetchFromServer<{ settings: Settings }, Settings>("/settings", {
    fallback: SETTINGS_FALLBACK,
    extract: (data) => data.settings,
    requireAuth: true,
  });
});

export const getVinDecodeStatusFromServer = cache(
  async (): Promise<{ enabled: boolean; provider: VinDecodeProvider }> => {
    return fetchFromServer<
      { enabled: boolean; provider: VinDecodeProvider },
      { enabled: boolean; provider: VinDecodeProvider }
    >("/settings/vin-decode-status", {
      fallback: { enabled: false, provider: "nhtsa" },
      extract: (data) => data,
    });
  },
);

export type GuestFeatureStatus = { guestWishlistEnabled: boolean; guestCartEnabled: boolean };

export const getGuestFeatureStatusFromServer = cache(async (): Promise<GuestFeatureStatus> => {
  return fetchFromServer<GuestFeatureStatus, GuestFeatureStatus>("/settings/guest-feature-status", {
    // Fails closed: if this lookup itself fails, WishlistButton/
    // AddToCartButton just fall back to always attempting their status
    // check (today's behavior) rather than assuming a guest feature is on.
    fallback: { guestWishlistEnabled: false, guestCartEnabled: false },
    extract: (data) => data,
  });
});

export const getUsersFromServer = cache(async (): Promise<AdminUsersPage> => {
  return fetchFromServer<AdminUsersPage, AdminUsersPage>("/users", {
    params: { page: 1, pageSize: 20 },
    fallback: { users: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

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
  isOpenNow: false,
  whatsappChatEnabled: false,
  updatedAt: new Date(0).toISOString(),
};

// Public endpoint (the Footer and Contact page read this on every guest page
// load too) — unlike the admin-only getXFromServer helpers, this must not
// bail out just because there's no admin session cookie (see
// getCategoriesFromServer's identical reasoning above).
export const getCompanyInfoFromServer = cache(async (): Promise<CompanyInfo> => {
  return fetchFromServer<{ companyInfo: CompanyInfo }, CompanyInfo>("/company-info", {
    fallback: COMPANY_INFO_FALLBACK,
    extract: (data) => data.companyInfo,
  });
});

export const getTermsFromServer = cache(async (): Promise<Terms> => {
  // Public endpoint (the guest /terms page reads this) — must not bail out
  // just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ terms: Terms }, Terms>("/terms", {
    fallback: { id: 0, content: { ka: "", en: "", ru: "" }, updatedAt: new Date(0).toISOString() },
    extract: (data) => data.terms,
  });
});

export const getPrivacyPolicyFromServer = cache(async (): Promise<PrivacyPolicy> => {
  // Public endpoint (the guest /privacy page reads this) — must not bail out
  // just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ privacyPolicy: PrivacyPolicy }, PrivacyPolicy>("/privacy-policy", {
    fallback: { id: 0, content: { ka: "", en: "", ru: "" }, updatedAt: new Date(0).toISOString() },
    extract: (data) => data.privacyPolicy,
  });
});

// Public endpoint (the guest /faq page reads this) — must not bail out just
// because there's no admin session cookie, same fix as getCategoriesFromServer.
export const getFaqListFromServer = cache(async (): Promise<Faq[]> => {
  return fetchFromServer<{ items: Faq[] }, Faq[]>("/faq/public", {
    fallback: [],
    extract: (data) => data.items,
  });
});

// Admin — every FAQ entry, including inactive ones (see the admin FAQ
// manager). Distinct from getFaqListFromServer's public/active-only list,
// same split as getBanksFromServer vs getPublicBanksFromServer.
export const getAllFaqsFromServer = cache(async (): Promise<Faq[]> => {
  return fetchFromServer<{ items: Faq[] }, Faq[]>("/faq", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

// Public endpoint (the guest /vacancies page reads this) — must not bail
// out just because there's no admin session cookie, same fix as
// getCategoriesFromServer.
export const getVacancyListFromServer = cache(async (): Promise<Vacancy[]> => {
  return fetchFromServer<{ items: Vacancy[] }, Vacancy[]>("/vacancies/public", {
    fallback: [],
    extract: (data) => data.items,
  });
});

// Public endpoint (the guest /vacancies/[slug] detail page) — an inactive or
// missing vacancy both 404, which fetchFromServer's catch collapses to this
// same `null` fallback, so the page can call notFound() either way.
export const getVacancyBySlugFromServer = cache(async (slug: string): Promise<Vacancy | null> => {
  return fetchFromServer<{ item: Vacancy }, Vacancy | null>(`/vacancies/by-slug/${slug}`, {
    fallback: null,
    extract: (data) => data.item,
  });
});

// Admin — every vacancy, including inactive ones (see the admin vacancies
// manager). Distinct from getVacancyListFromServer's public/active-only
// list, same split as getFaqListFromServer vs getAllFaqsFromServer.
export const getAllVacanciesFromServer = cache(async (): Promise<Vacancy[]> => {
  return fetchFromServer<{ items: Vacancy[] }, Vacancy[]>("/vacancies", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getEmailTemplatesFromServer = cache(async (): Promise<EmailTemplate[]> => {
  return fetchFromServer<{ items: EmailTemplate[] }, EmailTemplate[]>("/email-templates", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getOrderStatusesFromServer = cache(async (): Promise<OrderStatusItem[]> => {
  // Public endpoint (same reasoning as getCategoriesFromServer) — ordered
  // by sortOrder server-side, so callers don't need to re-sort.
  return fetchFromServer<{ items: OrderStatusItem[] }, OrderStatusItem[]>("/order-statuses", {
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getFinaSyncRunsFromServer = cache(async (): Promise<FinaSyncRun[]> => {
  return fetchFromServer<{ runs: FinaSyncRun[] }, FinaSyncRun[]>("/fina-sync/runs", {
    fallback: [],
    extract: (data) => data.runs,
    requireAuth: true,
  });
});

export const getScheduledJobsFromServer = cache(async (): Promise<ScheduledJobDefinition[]> => {
  return fetchFromServer<{ jobs: ScheduledJobDefinition[] }, ScheduledJobDefinition[]>("/scheduled-jobs", {
    fallback: [],
    extract: (data) => data.jobs,
    requireAuth: true,
  });
});

export const getScheduledJobRunsFromServer = cache(async (): Promise<ScheduledJobRunsPage> => {
  return fetchFromServer<ScheduledJobRunsPage, ScheduledJobRunsPage>("/scheduled-jobs/runs", {
    params: { page: 1, pageSize: 20 },
    fallback: { runs: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getErrorLogsFromServer = cache(async (): Promise<ErrorLogsPage> => {
  return fetchFromServer<ErrorLogsPage, ErrorLogsPage>("/error-logs", {
    params: { page: 1, pageSize: 25 },
    fallback: { logs: [], total: 0, page: 1, pageSize: 25 },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getBrandsFromServer = cache(async (): Promise<Brand[]> => {
  return fetchFromServer<{ brands: Brand[] }, Brand[]>("/brands", {
    fallback: [],
    extract: (data) => data.brands,
    requireAuth: true,
  });
});

export const getModelsFromServer = cache(async (): Promise<Model[]> => {
  return fetchFromServer<{ models: Model[] }, Model[]>("/models", {
    fallback: [],
    extract: (data) => data.models,
    requireAuth: true,
  });
});

export const getLookupItemsFromServer = cache(async (type: LookupTypeSlug): Promise<LookupItem[]> => {
  // Public endpoint (guest-facing forms, e.g. the address form's city
  // dropdown, read this too) — must not bail out just because there's no
  // admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: LookupItem[] }, LookupItem[]>(`/lookups/${type}`, {
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getVehicleCatalogFromServer = cache(async (): Promise<VehicleCatalogEntry[]> => {
  // Public endpoint (garage "pick from catalog" flow reads this too) — must
  // not bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ items: VehicleCatalogEntry[] }, VehicleCatalogEntry[]>("/vehicle-catalog", {
    fallback: [],
    extract: (data) => data.items,
  });
});

// Paginated variant for the admin catalog list screen's initial load —
// distinct from getVehicleCatalogFromServer above, which every other page
// (fitment pickers, garage, homepage, ...) still uses to fetch every row.
export const getVehicleCatalogPageFromServer = cache(async (
  page = 1,
  pageSize = 20,
): Promise<VehicleCatalogPage> => {
  return fetchFromServer<VehicleCatalogPage, VehicleCatalogPage>("/vehicle-catalog", {
    params: { page, pageSize },
    fallback: { items: [], total: 0, page, pageSize },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getVehicleCatalogEntryFromServer = cache(async (
  id: number,
): Promise<VehicleCatalogEntry | null> => {
  // Public endpoint (the garage's "compatible products" page reads this by
  // id) — must not bail out just because there's no admin session cookie,
  // same fix as getCategoriesFromServer.
  return fetchFromServer<{ item: VehicleCatalogEntry }, VehicleCatalogEntry | null>(
    `/vehicle-catalog/${id}`,
    { fallback: null, extract: (data) => data.item },
  );
});

export const getVehicleListingsFromServer = cache(async (
  categoryId?: number,
  bulkDiscountEventId?: number,
): Promise<VehicleListing[]> => {
  // Public endpoint (guest shop page reads this too) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings", {
    params: { categoryId, bulkDiscountEventId },
    fallback: [],
    extract: (data) => data.items,
  });
});

export type AdminListPage<T> = { items: T[]; total: number; page: number; pageSize: number };

// Vehicle category shop page's initial (server-rendered) load specifically —
// same reasoning as getProductsPageFromServer above (unlike
// getVehicleListingsFromServer, this sends page/pageSize/sortBy for real
// server-side pagination/sorting instead of an unbounded fetch).
// VehicleShopPage.tsx re-fetches subsequent pages/sorts itself via
// listVehicleListingsPage.
export const getVehicleListingsPageFromServer = cache(async (
  categoryId: number,
  page: number,
  sortBy: "newest" | "year-desc" | "price-asc" | "price-desc",
  bulkDiscountEventId?: number,
): Promise<AdminListPage<VehicleListing>> => {
  return fetchFromServer<AdminListPage<VehicleListing>, AdminListPage<VehicleListing>>(
    "/vehicle-listings",
    {
      params: { categoryId, page, pageSize: SHOP_PAGE_SIZE, sortBy, bulkDiscountEventId },
      fallback: { items: [], total: 0, page: 1, pageSize: SHOP_PAGE_SIZE },
      extract: (data) => data,
    },
  );
});

const ADMIN_LIST_INITIAL_PAGE_SIZE = 20;
const EMPTY_ADMIN_LIST_PAGE = { items: [], total: 0, page: 1, pageSize: ADMIN_LIST_INITIAL_PAGE_SIZE };

// Admin vehicle-listings list's initial (server-rendered) load specifically
// — see getAdminProductsFromServer's identical reasoning: an explicit
// `adminFilters=[]`, not an omitted param, is what gets the backend's lean
// admin-list projection from the very first render. Fetches only page 1 —
// VehicleListingsManager.tsx re-fetches subsequent pages itself.
export const getAdminVehicleListingsFromServer = cache(async (): Promise<AdminListPage<VehicleListing>> => {
  return fetchFromServer<AdminListPage<VehicleListing>, AdminListPage<VehicleListing>>(
    "/vehicle-listings",
    {
      params: { adminFilters: "[]", page: 1, pageSize: ADMIN_LIST_INITIAL_PAGE_SIZE },
      fallback: EMPTY_ADMIN_LIST_PAGE,
      extract: (data) => data,
      requireAuth: true,
    },
  );
});

export const getVehicleListingFromServer = cache(async (id: number): Promise<VehicleListing | null> => {
  // Public endpoint (guest vehicle detail page) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ item: VehicleListing }, VehicleListing | null>(
    `/vehicle-listings/${id}`,
    { fallback: null, extract: (data) => data.item },
  );
});

// Homepage "discounted vehicles" slider.
export const getOnSaleVehicleListingsFromServer = cache(async (limit: number): Promise<VehicleListing[]> => {
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings", {
    params: { onSale: true, limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "New Arrivals" mixed slider (FEATURED_MIXED) — a plain
// admin-curated flag, not a discount/popularity computation.
export const getFeaturedVehicleListingsFromServer = cache(async (limit: number): Promise<VehicleListing[]> => {
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings", {
    params: { featured: true, limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "popular vehicles" slider.
export const getPopularVehicleListingsFromServer = cache(async (limit: number): Promise<VehicleListing[]> => {
  return fetchFromServer<{ items: VehicleListing[] }, VehicleListing[]>("/vehicle-listings/popular", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getCategoryFiltersFromServer = cache(async (categoryId: number): Promise<CategoryFilter[]> => {
  // Public endpoint (guest shop filter sidebar reads this too) — must not
  // bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ items: CategoryFilter[] }, CategoryFilter[]>("/category-filters", {
    params: { categoryId },
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getVehicleCategoryFiltersFromServer = cache(async (
  categoryId: number,
): Promise<VehicleCategoryFilter[]> => {
  // Public endpoint (guest shop filter sidebar reads this too) — must not
  // bail out just because there's no admin session cookie, same fix as
  // getCategoriesFromServer.
  return fetchFromServer<{ items: VehicleCategoryFilter[] }, VehicleCategoryFilter[]>(
    "/vehicle-category-filters",
    { params: { categoryId }, fallback: [], extract: (data) => data.items },
  );
});

export const getMyAddressesFromServer = cache(async (): Promise<Address[]> => {
  return fetchFromServer<{ addresses: Address[] }, Address[]>("/users/me/addresses", {
    fallback: [],
    extract: (data) => data.addresses,
    requireAuth: true,
  });
});

export const getMyGarageFromServer = cache(async (): Promise<GarageVehicle[]> => {
  return fetchFromServer<{ items: GarageVehicle[] }, GarageVehicle[]>("/users/me/garage", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getMyWishlistFromServer = cache(async (): Promise<WishlistItem[]> => {
  return fetchFromServer<{ items: WishlistItem[] }, WishlistItem[]>("/users/me/wishlist", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

// Lightweight — just the header badge count, not the full wishlist with
// every nested product/vehicle detail. Same reasoning as
// getMyCartCountFromServer.
export const getMyWishlistCountFromServer = cache(async (): Promise<number> => {
  return fetchFromServer<{ count: number }, number>("/users/me/wishlist/count", {
    fallback: 0,
    extract: (data) => data.count,
    requireAuth: true,
  });
});

export const getMyCompareFromServer = cache(async (): Promise<CompareItem[]> => {
  return fetchFromServer<{ items: CompareItem[] }, CompareItem[]>("/users/me/compare", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

// Lightweight — just the header badge count, not the full comparison list
// with every nested product/vehicle detail. Same reasoning as
// getMyCartCountFromServer.
export const getMyCompareCountFromServer = cache(async (): Promise<number> => {
  return fetchFromServer<{ count: number }, number>("/users/me/compare/count", {
    fallback: 0,
    extract: (data) => data.count,
    requireAuth: true,
  });
});

const EMPTY_CART: Cart = { items: [], subtotal: 0, itemCount: 0 };

export const getMyCartFromServer = cache(async (): Promise<Cart> => {
  return fetchFromServer<Cart, Cart>("/users/me/cart", {
    fallback: EMPTY_CART,
    extract: (data) => data,
    requireAuth: true,
  });
});

// Lightweight — just the header badge count, not the full cart with every
// nested product/vehicle detail. Safe to call on every page load (see
// (guest)/layout.tsx), unlike getMyCartFromServer.
export const getMyCartCountFromServer = cache(async (): Promise<number> => {
  return fetchFromServer<{ count: number }, number>("/users/me/cart/count", {
    fallback: 0,
    extract: (data) => data.count,
    requireAuth: true,
  });
});

export const getMyOrdersFromServer = cache(async (): Promise<OrderSummary[]> => {
  return fetchFromServer<{ orders: OrderSummary[] }, OrderSummary[]>("/orders/me", {
    fallback: [],
    extract: (data) => data.orders,
    requireAuth: true,
  });
});

export const getMyOrderFromServer = cache(async (id: number): Promise<Order | null> => {
  return fetchFromServer<{ order: Order }, Order | null>(`/orders/me/${id}`, {
    fallback: null,
    extract: (data) => data.order,
    requireAuth: true,
  });
});

export const getOrdersFromServer = cache(async (): Promise<AdminOrdersPage> => {
  return fetchFromServer<AdminOrdersPage, AdminOrdersPage>("/orders", {
    params: { page: 1, pageSize: 20 },
    fallback: { orders: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

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

export const getDashboardStatsFromServer = cache(async (): Promise<DashboardStats> => {
  return fetchFromServer<DashboardStats, DashboardStats>("/dashboard/stats", {
    fallback: EMPTY_DASHBOARD_STATS,
    extract: (data) => data,
    requireAuth: true,
  });
});

const EMPTY_ANALYTICS_OVERVIEW: AnalyticsOverview = {
  range: { from: "", to: "" },
  financial: { revenue: 0, orderCount: 0, cancelledCount: 0, cancellationRate: 0, lostRevenue: 0 },
  revenueSeries: [],
  ordersByStatus: [],
  topProducts: [],
  topVehicleListings: [],
  cancellations: { reasonBreakdown: [], recentOrders: [] },
};

export const getAnalyticsFromServer = cache(async (filters: AnalyticsFilters = {}): Promise<AnalyticsOverview> => {
  return fetchFromServer<AnalyticsOverview, AnalyticsOverview>("/analytics/overview", {
    params: { dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined },
    fallback: EMPTY_ANALYTICS_OVERVIEW,
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getCompatibilityFromServer = cache(async (): Promise<CompatibilityPage> => {
  return fetchFromServer<CompatibilityPage, CompatibilityPage>("/compatibility", {
    params: { page: 1, pageSize: 20 },
    fallback: { items: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getProductBuyTogetherFromServer = cache(async (): Promise<ProductBuyTogetherPage> => {
  return fetchFromServer<ProductBuyTogetherPage, ProductBuyTogetherPage>("/product-buy-together", {
    params: { page: 1, pageSize: 20 },
    fallback: { items: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getAttributesFromServer = cache(async (): Promise<Attribute[]> => {
  return fetchFromServer<{ items: Attribute[] }, Attribute[]>("/attributes", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getProductBrandsFromServer = cache(async (): Promise<ProductBrand[]> => {
  return fetchFromServer<{ items: ProductBrand[] }, ProductBrand[]>("/product-brands", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getUnitsFromServer = cache(async (): Promise<Unit[]> => {
  return fetchFromServer<{ items: Unit[] }, Unit[]>("/units", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getProductsFromServer = cache(async (
  categoryId?: number,
  vehicleCatalogId?: number,
): Promise<Product[]> => {
  // Public endpoint (guest shop page reads this too) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ items: Product[] }, Product[]>("/products", {
    params: { categoryId: categoryId || undefined, vehicleCatalogId: vehicleCatalogId || undefined },
    fallback: [],
    extract: (data) => data.items,
  });
});

const SHOP_PAGE_SIZE = 20;

// Category shop page's initial (server-rendered) load specifically — unlike
// getProductsFromServer above (shared with sitemap/admin pickers/etc., which
// need the full unbounded list), this sends page/pageSize/sortBy so the
// backend does real server-side pagination and sorting (see
// products.service.ts's listProducts) instead of the page shipping the
// whole category's catalog to the browser to sort/paginate itself.
// ProductShopPage.tsx re-fetches subsequent pages/sorts itself via
// listProductsPage.
export const getProductsPageFromServer = cache(async (
  categoryId: number,
  page: number,
  sortBy: "newest" | "price-asc" | "price-desc",
  vehicleCatalogId?: number,
): Promise<AdminListPage<Product>> => {
  return fetchFromServer<AdminListPage<Product>, AdminListPage<Product>>("/products", {
    params: { categoryId, vehicleCatalogId, page, pageSize: SHOP_PAGE_SIZE, sortBy },
    fallback: { items: [], total: 0, page: 1, pageSize: SHOP_PAGE_SIZE },
    extract: (data) => data,
  });
});

// Admin products list's initial (server-rendered) load specifically —
// unlike getProductsFromServer above (shared with the storefront/sitemap/
// admin pickers, which need the full card-rendering shape), this always
// sends `adminFilters=[]` explicitly so the backend takes the lean
// admin-list projection from the very first render, not just once the admin
// panel's client-side refresh() kicks in after picking a filter (see
// products.service.ts's listProducts and lib/api/products.ts's listProducts
// for why an explicit `[]`, not an omitted param, is what signals this).
// Fetches only page 1 — ProductsManager.tsx re-fetches subsequent pages.
export const getAdminProductsFromServer = cache(async (): Promise<AdminListPage<Product>> => {
  return fetchFromServer<AdminListPage<Product>, AdminListPage<Product>>("/products", {
    params: { adminFilters: "[]", page: 1, pageSize: ADMIN_LIST_INITIAL_PAGE_SIZE },
    fallback: EMPTY_ADMIN_LIST_PAGE,
    extract: (data) => data,
    requireAuth: true,
  });
});

// Homepage "discounted products" slider.
export const getOnSaleProductsFromServer = cache(async (limit: number): Promise<Product[]> => {
  return fetchFromServer<{ items: Product[] }, Product[]>("/products", {
    params: { onSale: true, limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "New Arrivals" mixed slider (FEATURED_MIXED) — a plain
// admin-curated flag, not a discount/popularity computation.
export const getFeaturedProductsFromServer = cache(async (limit: number): Promise<Product[]> => {
  return fetchFromServer<{ items: Product[] }, Product[]>("/products", {
    params: { featured: true, limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "popular products" slider.
export const getPopularProductsFromServer = cache(async (limit: number): Promise<Product[]> => {
  return fetchFromServer<{ items: Product[] }, Product[]>("/products/popular", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getProductDetailFromServer = cache(async (
  slug: string,
  vehicleCatalogId?: string,
): Promise<ProductDetail | null> => {
  // Public endpoint (guest product view page) — must not bail out just
  // because there's no admin session cookie, same fix as getCategoriesFromServer.
  return fetchFromServer<{ item: ProductDetail }, ProductDetail | null>(`/products/by-slug/${slug}`, {
    params: { vehicleCatalogId: vehicleCatalogId || undefined },
    fallback: null,
    extract: (data) => data.item,
  });
});

// Product detail page's "similar products" section — replaces the old
// naive "everything else in the same category" slice with the algorithmic,
// fitment-overlap-ranked list (see recommendations.service.ts).
export const getSimilarProductsFromServer = cache(async (
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<Product[]> => {
  return fetchFromServer<{ items: Product[] }, Product[]>(
    `/products/${productId}/recommendations/similar`,
    {
      params: { vehicleCatalogId: vehicleCatalogId || undefined, limit },
      fallback: [],
      extract: (data) => data.items,
    },
  );
});

// Product detail page's algorithmic "frequently bought together" — a
// fallback shown when the admin hasn't curated a buyTogether list for this
// product (see FrequentlyBoughtTogether.tsx).
export const getFrequentlyBoughtTogetherFromServer = cache(async (
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<Product[]> => {
  return fetchFromServer<{ items: Product[] }, Product[]>(
    `/products/${productId}/recommendations/frequently-bought-together`,
    {
      params: { vehicleCatalogId: vehicleCatalogId || undefined, limit },
      fallback: [],
      extract: (data) => data.items,
    },
  );
});

// Product detail page's algorithmic "customers who viewed this also
// viewed" — view-based co-occurrence, independent of buyTogether/FBT.
export const getViewedTogetherFromServer = cache(async (
  productId: number,
  vehicleCatalogId?: string,
  limit?: number,
): Promise<Product[]> => {
  return fetchFromServer<{ items: Product[] }, Product[]>(
    `/products/${productId}/recommendations/viewed-together`,
    {
      params: { vehicleCatalogId: vehicleCatalogId || undefined, limit },
      fallback: [],
      extract: (data) => data.items,
    },
  );
});

// Homepage "recently viewed" section (RECENTLY_VIEWED) — works for guests
// too (the backend always resolves an owner, minting a guest-id cookie if
// needed), unlike getRecommendedForMeFromServer's auth-only gate.
export const getRecentlyViewedFromServer = cache(async (limit?: number): Promise<Product[]> => {
  return fetchFromServer<{ items: Product[] }, Product[]>("/users/me/recently-viewed", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "popular for your vehicle" section (POPULAR_FOR_VEHICLE) — the
// caller skips this entirely when there's no SELECTED_VEHICLE_COOKIE, same
// as it does for getProductDetailFromServer's vehicleCatalogId.
export const getPopularForVehicleFromServer = cache(async (
  vehicleCatalogId: string,
  limit?: number,
): Promise<Product[]> => {
  return fetchFromServer<{ items: Product[] }, Product[]>("/recommendations/popular-for-vehicle", {
    params: { vehicleCatalogId, limit },
    fallback: [],
    extract: (data) => data.items,
  });
});

// Homepage "recommended for you" section (RECOMMENDED_FOR_YOU) — auth-gated
// like getMyGarageFromServer; guests never even reach the API call.
export const getRecommendedForMeFromServer = cache(async (limit?: number): Promise<Product[]> => {
  return fetchFromServer<{ items: Product[] }, Product[]>("/recommendations/for-me", {
    params: { limit },
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getProductFromServer = cache(async (id: number): Promise<Product | null> => {
  return fetchFromServer<{ item: Product }, Product | null>(`/products/${id}`, {
    fallback: null,
    extract: (data) => data.item,
    requireAuth: true,
  });
});

export const getShopProductsFromServer = cache(async (filters: {
  categoryId?: number;
  brandIds?: number[];
  onSale?: boolean;
  bulkDiscountEventId?: number;
}): Promise<Product[]> => {
  // Public endpoint (the /shop page) — must not bail out just because there
  // is no admin session cookie, same fix as getCategoriesFromServer. Kept
  // unbounded — ShopAllProductsPage.tsx uses this only to derive its
  // category-checkbox facet list (needs to see every category present, not
  // just the current page's); getShopProductsPageFromServer below feeds the
  // actual grid.
  return fetchFromServer<{ items: Product[] }, Product[]>("/products", {
    params: {
      categoryId: filters.categoryId,
      brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
      onSale: filters.onSale || undefined,
      bulkDiscountEventId: filters.bulkDiscountEventId,
    },
    fallback: [],
    extract: (data) => data.items,
  });
});

// /shop page's initial (server-rendered) grid load specifically — real
// server-side pagination/sorting (see products.service.ts's listProducts),
// unlike getShopProductsFromServer above. ShopAllProductsPage.tsx re-fetches
// subsequent pages/filters/sorts itself via listProductsPage.
export const getShopProductsPageFromServer = cache(async (filters: {
  categoryId?: number;
  brandIds?: number[];
  onSale?: boolean;
  bulkDiscountEventId?: number;
}): Promise<AdminListPage<Product>> => {
  return fetchFromServer<AdminListPage<Product>, AdminListPage<Product>>("/products", {
    params: {
      categoryId: filters.categoryId,
      brandIds: filters.brandIds?.length ? filters.brandIds : undefined,
      onSale: filters.onSale || undefined,
      bulkDiscountEventId: filters.bulkDiscountEventId,
      page: 1,
      pageSize: SHOP_PAGE_SIZE,
      sortBy: "newest",
    },
    fallback: { items: [], total: 0, page: 1, pageSize: SHOP_PAGE_SIZE },
    extract: (data) => data,
  });
});

export const getHeroSlidesFromServer = cache(async (): Promise<HeroSlide[]> => {
  return fetchFromServer<{ items: HeroSlide[] }, HeroSlide[]>("/hero-slides", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getPromoCodesFromServer = cache(async (domain: PromoCodeDomain): Promise<PromoCode[]> => {
  return fetchFromServer<{ items: PromoCode[] }, PromoCode[]>("/promo-codes", {
    params: { domain },
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

// Public endpoint (the homepage hero) — must not bail out just because
// there's no admin session cookie, same fix as getCategoriesFromServer.
export const getPublicHeroSlidesFromServer = cache(async (): Promise<HeroSlide[]> => {
  return fetchFromServer<{ items: HeroSlide[] }, HeroSlide[]>("/hero-slides/public", {
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getTeamMembersFromServer = cache(async (): Promise<TeamMember[]> => {
  return fetchFromServer<{ items: TeamMember[] }, TeamMember[]>("/team-members", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

// Public endpoint (the /about page) — must not bail out just because
// there's no admin session cookie, same fix as getCategoriesFromServer.
export const getPublicTeamMembersFromServer = cache(async (): Promise<TeamMember[]> => {
  return fetchFromServer<{ items: TeamMember[] }, TeamMember[]>("/team-members/public", {
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getBanksFromServer = cache(async (): Promise<Bank[]> => {
  return fetchFromServer<{ items: Bank[] }, Bank[]>("/banks", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getServiceTypesFromServer = cache(async (): Promise<ServiceType[]> => {
  return fetchFromServer<{ items: ServiceType[] }, ServiceType[]>("/service-types", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

const EMPTY_SERVICE_RECORDS_ADMIN_PAGE: ServiceRecordsAdminPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
};

// Workshop "სერვისის ისტორია" screen's admin-wide overview table's initial
// (server-rendered) load — RecentServiceRecordsPanel.tsx re-fetches
// subsequent pages/filters itself.
export const getServiceRecordsAdminFromServer = cache(async (): Promise<ServiceRecordsAdminPage> => {
  return fetchFromServer<ServiceRecordsAdminPage, ServiceRecordsAdminPage>("/service-records/admin", {
    params: { page: 1, pageSize: 20 },
    fallback: EMPTY_SERVICE_RECORDS_ADMIN_PAGE,
    extract: (data) => data,
    requireAuth: true,
  });
});

// Public endpoint (the checkout page's bank picker) — must not bail out
// just because there's no admin session cookie, same fix as
// getPublicHeroSlidesFromServer.
export const getPublicBanksFromServer = cache(async (): Promise<PublicBank[]> => {
  return fetchFromServer<{ items: PublicBank[] }, PublicBank[]>("/banks/public", {
    fallback: [],
    extract: (data) => data.items,
  });
});

export const getHomepageSectionsFromServer = cache(async (): Promise<HomepageSection[]> => {
  return fetchFromServer<{ items: HomepageSection[] }, HomepageSection[]>("/homepage-sections", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

// Public endpoint (the homepage reads this) — must not bail out just
// because there's no admin session cookie, same fix as
// getCategoriesFromServer.
export const getPublicHomepageSectionsFromServer = cache(async (): Promise<HomepageSection[]> => {
  return fetchFromServer<{ items: HomepageSection[] }, HomepageSection[]>(
    "/homepage-sections/public",
    { fallback: [], extract: (data) => data.items },
  );
});

export const getNewsletterCampaignsFromServer = cache(async (): Promise<NewsletterCampaign[]> => {
  return fetchFromServer<{ items: NewsletterCampaign[] }, NewsletterCampaign[]>(
    "/newsletter-campaigns",
    { fallback: [], extract: (data) => data.items, requireAuth: true },
  );
});

export const getNewsletterSubscribersFromServer = cache(async (): Promise<PagedResult<NewsletterSubscriber>> => {
  return fetchFromServer<PagedResult<NewsletterSubscriber>, PagedResult<NewsletterSubscriber>>(
    "/newsletter/subscribers",
    {
      params: { page: 1, pageSize: 20 },
      fallback: { items: [], total: 0, page: 1, pageSize: 20 },
      extract: (data) => data,
      requireAuth: true,
    },
  );
});

export const getNewsletterSubscriberCountsFromServer = cache(async (): Promise<NewsletterSubscriberCounts> => {
  return fetchFromServer<NewsletterSubscriberCounts, NewsletterSubscriberCounts>(
    "/newsletter/subscribers/counts",
    {
      fallback: { pending: 0, confirmed: 0, unsubscribed: 0 },
      extract: (data) => data,
      requireAuth: true,
    },
  );
});

export const getSuspiciousLoginActivityFromServer = cache(async (): Promise<SuspiciousLoginActivity> => {
  return fetchFromServer<SuspiciousLoginActivity, SuspiciousLoginActivity>(
    "/fraud/suspicious-logins",
    {
      fallback: { windowMinutes: 0, threshold: 0, byEmail: [], byIp: [] },
      extract: (data) => data,
      requireAuth: true,
    },
  );
});

export const getSessionsFromServer = cache(async (): Promise<PagedResult<Session>> => {
  return fetchFromServer<PagedResult<Session>, PagedResult<Session>>("/sessions", {
    params: { page: 1, pageSize: 20 },
    fallback: { items: [], total: 0, page: 1, pageSize: 20 },
    extract: (data) => data,
    requireAuth: true,
  });
});

export const getVisitorOverviewFromServer = cache(async (): Promise<VisitorOverview> => {
  return fetchFromServer<VisitorOverview, VisitorOverview>("/visitors/overview", {
    fallback: { activeNow: 0, todayVisitors: 0, weekVisitors: 0, dailySeries: [] },
    extract: (data) => data,
    requireAuth: true,
  });
});

import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { PUBLIC_STATIC_CACHE_SECONDS, fetchFromServer, fetchPublicCacheable } from "./core";
import type { Category } from "../categories";
import type { HeroSlide } from "../hero-slides";
import type { TeamMember } from "../team-members";
import type { PublicBank } from "../banks";
import type { HomepageSection } from "../homepage-sections";
import type { CompanyInfo, WeekDay } from "../company-info";
import type { Terms } from "../terms";
import type { PrivacyPolicy } from "../privacy-policy";
import type { Faq } from "../faq";
import type { Vacancy } from "../vacancies";
import type { PublicServiceType } from "../service-types";

// Admin-edited site content (categories, company info, legal pages, FAQ, vacancies, hero slides, team, homepage sections).

// Guest storefront navigation reads this on literally every page — cached
// across requests (see PUBLIC_STATIC_CACHE_SECONDS/fetchPublicCacheable's
// comments above), unlike the admin-only getXFromServer helpers below, which
// still must not bail out just because there's no admin session cookie
// (this one never even looks for one).
const getCachedCategories = unstable_cache(
  () =>
    fetchPublicCacheable<{ categories: Category[] }, Category[]>("/categories", {
      fallback: [],
      extract: (data) => data.categories,
    }),
  ["categories"],
  { revalidate: PUBLIC_STATIC_CACHE_SECONDS, tags: ["categories"] },
);
export const getCategoriesFromServer = cache(getCachedCategories);

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

// The Footer and Contact page read this on every guest page load — cached
// across requests, same reasoning as getCategoriesFromServer above.
const getCachedCompanyInfo = unstable_cache(
  () =>
    fetchPublicCacheable<{ companyInfo: CompanyInfo }, CompanyInfo>("/company-info", {
      fallback: COMPANY_INFO_FALLBACK,
      extract: (data) => data.companyInfo,
    }),
  ["company-info"],
  { revalidate: PUBLIC_STATIC_CACHE_SECONDS, tags: ["company-info"] },
);
export const getCompanyInfoFromServer = cache(getCachedCompanyInfo);

// The guest /terms page reads this on every load — cached across requests,
// same reasoning as getCategoriesFromServer above.
const getCachedTerms = unstable_cache(
  () =>
    fetchPublicCacheable<{ terms: Terms }, Terms>("/terms", {
      fallback: { id: 0, content: { ka: "", en: "", ru: "" }, updatedAt: new Date(0).toISOString() },
      extract: (data) => data.terms,
    }),
  ["terms"],
  { revalidate: PUBLIC_STATIC_CACHE_SECONDS, tags: ["terms"] },
);
export const getTermsFromServer = cache(getCachedTerms);

// The guest /privacy page reads this on every load — cached across requests,
// same reasoning as getCategoriesFromServer above.
const getCachedPrivacyPolicy = unstable_cache(
  () =>
    fetchPublicCacheable<{ privacyPolicy: PrivacyPolicy }, PrivacyPolicy>("/privacy-policy", {
      fallback: { id: 0, content: { ka: "", en: "", ru: "" }, updatedAt: new Date(0).toISOString() },
      extract: (data) => data.privacyPolicy,
    }),
  ["privacy-policy"],
  { revalidate: PUBLIC_STATIC_CACHE_SECONDS, tags: ["privacy-policy"] },
);
export const getPrivacyPolicyFromServer = cache(getCachedPrivacyPolicy);

// The guest /faq page reads this on every load — cached across requests,
// same reasoning as getCategoriesFromServer above.
const getCachedFaqList = unstable_cache(
  () =>
    fetchPublicCacheable<{ items: Faq[] }, Faq[]>("/faq/public", {
      fallback: [],
      extract: (data) => data.items,
    }),
  ["faq-public"],
  { revalidate: PUBLIC_STATIC_CACHE_SECONDS, tags: ["faq-public"] },
);
export const getFaqListFromServer = cache(getCachedFaqList);

// The guest /service page's list of what the workshop does — cached across
// requests like the other admin-edited public content above.
const getCachedPublicServiceTypes = unstable_cache(
  () =>
    fetchPublicCacheable<{ items: PublicServiceType[] }, PublicServiceType[]>("/service-types/public", {
      fallback: [],
      extract: (data) => data.items,
    }),
  ["service-types-public"],
  { revalidate: PUBLIC_STATIC_CACHE_SECONDS, tags: ["service-types-public"] },
);
export const getPublicServiceTypesFromServer = cache(getCachedPublicServiceTypes);

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

export const getHeroSlidesFromServer = cache(async (): Promise<HeroSlide[]> => {
  return fetchFromServer<{ items: HeroSlide[] }, HeroSlide[]>("/hero-slides", {
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

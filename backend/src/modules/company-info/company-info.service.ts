import { ApiError } from "../../lib/ApiError.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { cache } from "../../lib/cache.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import { getCurrentTbilisiDayAndTime } from "../../lib/tbilisi-dates.js";
import { isWhatsAppCloudApiConfigured } from "../../lib/whatsapp-cloud-api.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getWhatsAppSupportPhoneNumber } from "../settings/settings.service.js";
import { companyInfoRepository } from "./company-info.repository.js";
import type { UpdateCompanyInfoInput } from "./company-info.schema.js";
import type { WeekDay } from "../../generated/prisma/index.js";

// Read constantly (every guest page load pulls this for the Header/Footer/
// Contact page) but written only from the admin company-info form — a
// perfect read-through cache candidate, same pattern as lookups.service.ts's
// listLookupItems / settings.service.ts's per-key `cached()` helper.
const COMPANY_INFO_CACHE_KEY = "company-info";

const WEEK_DAYS: WeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

type CompanyInfoRow = NonNullable<Awaited<ReturnType<typeof companyInfoRepository.findFirst>>>;

// "HH:MM" strings compare correctly with plain `<=`/`>=` for a same-day
// range — doesn't handle a range that spans midnight (e.g. 22:00-02:00),
// which this business doesn't have.
function isCurrentlyOpen(
  byDay: Map<WeekDay, { isClosed: boolean; openTime: string | null; closeTime: string | null }>,
): boolean {
  const { dayOfWeek, time } = getCurrentTbilisiDayAndTime();
  const hour = byDay.get(dayOfWeek);
  if (!hour || hour.isClosed || !hour.openTime || !hour.closeTime) return false;
  return time >= hour.openTime && time <= hour.closeTime;
}

// Always returns all 7 days in a fixed order, defaulting missing ones to
// closed — the admin form always renders a complete week grid regardless of
// how many rows actually exist in the DB (none at all right after bootstrap).
//
// Deliberately does NOT include isOpenNow/whatsappChatEnabled — this is the
// part cached indefinitely by getCompanyInfo below (invalidated only on an
// actual write), and "is it open right now" changes with the clock, not
// with admin edits. Those two are computed fresh on every getCompanyInfo
// call instead, layered on top of this cached shape.
function toResponse(row: CompanyInfoRow) {
  const byDay = new Map(row.workingHours.map((hour) => [hour.dayOfWeek, hour]));

  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logoUrl,
    city: row.city,
    street: row.street,
    phone: row.phone,
    email: row.email,
    facebookUrl: row.facebookUrl,
    instagramUrl: row.instagramUrl,
    youtubeUrl: row.youtubeUrl,
    tiktokUrl: row.tiktokUrl,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    workingHours: WEEK_DAYS.map((dayOfWeek) => {
      const hour = byDay.get(dayOfWeek);
      return {
        dayOfWeek,
        isClosed: hour?.isClosed ?? true,
        openTime: hour?.openTime ?? null,
        closeTime: hour?.closeTime ?? null,
      };
    }),
    updatedAt: row.updatedAt,
  };
}

// Singleton bootstrap — creates the one CompanyInfo row on first access
// instead of relying on a seed script, since this is admin-editable data
// with no meaningful default beyond a placeholder name. The `singleton`
// column's unique constraint is the actual race guard (two concurrent
// first-ever requests can both pass the findFirst check above); the loser
// here just re-fetches the winner's row instead of surfacing a 500.
async function getOrCreateCompanyInfo(): Promise<CompanyInfoRow> {
  const existing = await companyInfoRepository.findFirst();
  if (existing) return existing;

  try {
    return await companyInfoRepository.create({ name: "კომპანია" });
  } catch (error) {
    if (isUniqueConstraintViolation(error, "singleton")) {
      const row = await companyInfoRepository.findFirst();
      if (row) return row;
    }
    throw error;
  }
}

export async function getCompanyInfo() {
  let base = cache.get<ReturnType<typeof toResponse>>(COMPANY_INFO_CACHE_KEY);
  if (!base) {
    base = toResponse(await getOrCreateCompanyInfo());
    cache.set(COMPANY_INFO_CACHE_KEY, base);
  }

  const byDay = new Map(base.workingHours.map((hour) => [hour.dayOfWeek, hour]));
  const whatsappSupportPhoneNumber = await getWhatsAppSupportPhoneNumber();
  return {
    ...base,
    isOpenNow: isCurrentlyOpen(byDay),
    whatsappChatEnabled: isWhatsAppCloudApiConfigured() && whatsappSupportPhoneNumber != null,
  };
}

// Same check as addresses.service.ts's assertCityExists, for the identical
// City lookup table — was missing here, so submitting a stale/deleted
// cityId hit the DB's FK constraint directly as a raw, unmapped
// PrismaClientKnownRequestError (P2003), surfacing as an unexplained 500
// instead of a clean "მითითებული ქალაქი არ არსებობს" 400.
async function assertCityExists(cityId: number) {
  const city = await lookupsRepository.findById(getLookupDelegate("cities"), cityId);
  if (!city) {
    throw new ApiError(400, "მითითებული ქალაქი არ არსებობს", "CITY_NOT_FOUND");
  }
}

export async function updateCompanyInfo(input: UpdateCompanyInfoInput) {
  const existing = await getOrCreateCompanyInfo();

  if (input.cityId != null) {
    await assertCityExists(input.cityId);
  }

  await companyInfoRepository.update(existing.id, {
    name: input.name,
    cityId: input.cityId,
    street: input.street,
    phone: input.phone,
    email: input.email,
    facebookUrl: input.facebookUrl,
    instagramUrl: input.instagramUrl,
    youtubeUrl: input.youtubeUrl,
    tiktokUrl: input.tiktokUrl,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  if (input.workingHours) {
    await companyInfoRepository.replaceWorkingHours(existing.id, input.workingHours);
  }

  cache.del(COMPANY_INFO_CACHE_KEY);
  return getCompanyInfo();
}

export async function setCompanyLogo(file: Express.Multer.File) {
  const existing = await getOrCreateCompanyInfo();
  const logoUrl = await saveUploadedImage("company-info", file);
  await companyInfoRepository.updateLogo(existing.id, logoUrl);
  void deleteUploadedImage(existing.logoUrl);
  cache.del(COMPANY_INFO_CACHE_KEY);
  return getCompanyInfo();
}

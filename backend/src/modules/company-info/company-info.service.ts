import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { cache } from "../../lib/cache.js";
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

// Always returns all 7 days in a fixed order, defaulting missing ones to
// closed — the admin form always renders a complete week grid regardless of
// how many rows actually exist in the DB (none at all right after bootstrap).
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
// with no meaningful default beyond a placeholder name.
async function getOrCreateCompanyInfo(): Promise<CompanyInfoRow> {
  const existing = await companyInfoRepository.findFirst();
  if (existing) return existing;
  return companyInfoRepository.create({ name: "კომპანია" });
}

export async function getCompanyInfo() {
  const cached = cache.get<ReturnType<typeof toResponse>>(COMPANY_INFO_CACHE_KEY);
  if (cached) return cached;

  const response = toResponse(await getOrCreateCompanyInfo());
  cache.set(COMPANY_INFO_CACHE_KEY, response);
  return response;
}

export async function updateCompanyInfo(input: UpdateCompanyInfoInput) {
  const existing = await getOrCreateCompanyInfo();

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

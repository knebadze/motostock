import { ApiError } from "../../lib/ApiError.js";
import { homepageSectionsRepository } from "./homepage-sections.repository.js";
import type { UpdateHomepageSectionInput } from "./homepage-sections.schema.js";
import type { HomepageSectionType } from "../../generated/prisma/index.js";

type HomepageSectionRow = {
  id: number;
  type: HomepageSectionType;
  titleKa: string;
  titleEn: string;
  titleRu: string;
  isActive: boolean;
  sortOrder: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
};

// Defaults used only the first time each row is bootstrapped — after that,
// whatever the admin has saved always wins.
const DEFAULTS: Record<
  HomepageSectionType,
  { titleKa: string; titleEn: string; titleRu: string; sortOrder: number }
> = {
  DISCOUNTED_PRODUCTS: {
    titleKa: "ფასდაკლებული პროდუქტები",
    titleEn: "Discounted Products",
    titleRu: "Товары со скидкой",
    sortOrder: 0,
  },
  POPULAR_PRODUCTS: {
    titleKa: "პოპულარული პროდუქტები",
    titleEn: "Popular Products",
    titleRu: "Популярные товары",
    sortOrder: 1,
  },
  DISCOUNTED_VEHICLES: {
    titleKa: "ფასდაკლებული ტრანსპორტი",
    titleEn: "Discounted Vehicles",
    titleRu: "Транспорт со скидкой",
    sortOrder: 2,
  },
  POPULAR_VEHICLES: {
    titleKa: "პოპულარული ტრანსპორტი",
    titleEn: "Popular Vehicles",
    titleRu: "Популярный транспорт",
    sortOrder: 3,
  },
  CATEGORIES: {
    titleKa: "კატეგორიები",
    titleEn: "Categories",
    titleRu: "Категории",
    sortOrder: 4,
  },
};

const ALL_TYPES: HomepageSectionType[] = [
  "DISCOUNTED_PRODUCTS",
  "POPULAR_PRODUCTS",
  "DISCOUNTED_VEHICLES",
  "POPULAR_VEHICLES",
  "CATEGORIES",
];

function toResponse(row: HomepageSectionRow) {
  return {
    id: row.id,
    type: row.type,
    title: { ka: row.titleKa, en: row.titleEn, ru: row.titleRu },
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    itemCount: row.itemCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Singleton-per-type bootstrap — creates the fixed rows (one per
// HomepageSectionType) on first access instead of a seed script, same
// pattern as CompanyInfo's getOrCreateCompanyInfo. Admin never
// creates/deletes these rows directly.
async function ensureBootstrapped(): Promise<void> {
  for (const type of ALL_TYPES) {
    const existing = await homepageSectionsRepository.findByType(type);
    if (existing) continue;

    const defaults = DEFAULTS[type];
    await homepageSectionsRepository.create({
      type,
      titleKa: defaults.titleKa,
      titleEn: defaults.titleEn,
      titleRu: defaults.titleRu,
      isActive: true,
      sortOrder: defaults.sortOrder,
      itemCount: 10,
    });
  }
}

export async function listHomepageSections() {
  await ensureBootstrapped();
  const rows = await homepageSectionsRepository.findMany();
  return rows.map(toResponse);
}

export async function listPublicHomepageSections() {
  await ensureBootstrapped();
  const rows = await homepageSectionsRepository.findMany(true);
  return rows.map(toResponse);
}

export async function updateHomepageSection(id: number, input: UpdateHomepageSectionInput) {
  const existing = await homepageSectionsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "სექცია ვერ მოიძებნა");
  }

  const row = await homepageSectionsRepository.update(id, {
    ...(input.title !== undefined
      ? { titleKa: input.title.ka, titleEn: input.title.en, titleRu: input.title.ru }
      : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.itemCount !== undefined ? { itemCount: input.itemCount } : {}),
  });
  return toResponse(row);
}

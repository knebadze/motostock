import { ApiError } from "../../lib/ApiError.js";
import { homepageProductSlidersRepository } from "./homepage-product-sliders.repository.js";
import type { UpdateHomepageProductSliderInput } from "./homepage-product-sliders.schema.js";
import type { HomepageProductSliderType } from "../../generated/prisma/index.js";

type HomepageProductSliderRow = {
  id: number;
  type: HomepageProductSliderType;
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
  HomepageProductSliderType,
  { titleKa: string; titleEn: string; titleRu: string; sortOrder: number }
> = {
  DISCOUNTED: {
    titleKa: "ფასდაკლებული პროდუქტები",
    titleEn: "Discounted Products",
    titleRu: "Товары со скидкой",
    sortOrder: 0,
  },
  POPULAR: {
    titleKa: "პოპულარული პროდუქტები",
    titleEn: "Popular Products",
    titleRu: "Популярные товары",
    sortOrder: 1,
  },
};

const ALL_TYPES: HomepageProductSliderType[] = ["DISCOUNTED", "POPULAR"];

function toResponse(row: HomepageProductSliderRow) {
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

// Singleton-per-type bootstrap — creates the fixed DISCOUNTED/POPULAR rows
// on first access instead of a seed script, same pattern as CompanyInfo's
// getOrCreateCompanyInfo. Admin never creates/deletes these rows directly.
async function ensureBootstrapped(): Promise<void> {
  for (const type of ALL_TYPES) {
    const existing = await homepageProductSlidersRepository.findByType(type);
    if (existing) continue;

    const defaults = DEFAULTS[type];
    await homepageProductSlidersRepository.create({
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

export async function listHomepageProductSliders() {
  await ensureBootstrapped();
  const rows = await homepageProductSlidersRepository.findMany();
  return rows.map(toResponse);
}

export async function listPublicHomepageProductSliders() {
  await ensureBootstrapped();
  const rows = await homepageProductSlidersRepository.findMany(true);
  return rows.map(toResponse);
}

export async function updateHomepageProductSlider(id: number, input: UpdateHomepageProductSliderInput) {
  const existing = await homepageProductSlidersRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "სლაიდერი ვერ მოიძებნა");
  }

  const row = await homepageProductSlidersRepository.update(id, {
    ...(input.title !== undefined
      ? { titleKa: input.title.ka, titleEn: input.title.en, titleRu: input.title.ru }
      : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.itemCount !== undefined ? { itemCount: input.itemCount } : {}),
  });
  return toResponse(row);
}

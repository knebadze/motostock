import { ApiError } from "../../lib/ApiError.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { productBrandsRepository } from "../product-brands/product-brands.repository.js";
import { heroSlidesRepository } from "./hero-slides.repository.js";
import type {
  CreateHeroSlideInput,
  HeroSlideTextPositionInput,
  HeroSlideTypeInput,
  HeroSlideVerticalPositionInput,
  ReorderHeroSlidesInput,
  UpdateHeroSlideInput,
} from "./hero-slides.schema.js";

// Slide types whose button carries admin-typed text — CTA's link is also
// admin-typed (buttonLink), DISCOUNT's link is always computed instead (see
// discountCategoryId/discountProductBrandId).
const TYPES_WITH_BUTTON_LABEL = new Set<HeroSlideTypeInput>(["CTA", "DISCOUNT"]);

type HeroSlideRow = {
  id: number;
  type: HeroSlideTypeInput;
  titleKa: string;
  titleEn: string;
  titleRu: string;
  subtitleKa: string | null;
  subtitleEn: string | null;
  subtitleRu: string | null;
  imageUrl: string | null;
  buttonLabelKa: string | null;
  buttonLabelEn: string | null;
  buttonLabelRu: string | null;
  buttonLink: string | null;
  discountCategoryId: number | null;
  discountProductBrandId: number | null;
  textPosition: HeroSlideTextPositionInput;
  verticalPosition: HeroSlideVerticalPositionInput;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(row: HeroSlideRow) {
  const hasSubtitle = row.subtitleKa != null && row.subtitleEn != null && row.subtitleRu != null;
  const hasButtonLabel =
    row.buttonLabelKa != null && row.buttonLabelEn != null && row.buttonLabelRu != null;

  return {
    id: row.id,
    type: row.type,
    title: { ka: row.titleKa, en: row.titleEn, ru: row.titleRu },
    subtitle: hasSubtitle
      ? { ka: row.subtitleKa as string, en: row.subtitleEn as string, ru: row.subtitleRu as string }
      : null,
    imageUrl: row.imageUrl,
    buttonLabel: hasButtonLabel
      ? {
          ka: row.buttonLabelKa as string,
          en: row.buttonLabelEn as string,
          ru: row.buttonLabelRu as string,
        }
      : null,
    buttonLink: row.buttonLink,
    discountCategoryId: row.discountCategoryId,
    discountProductBrandId: row.discountProductBrandId,
    textPosition: row.textPosition,
    verticalPosition: row.verticalPosition,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertButtonLabelPresent(
  buttonLabel: { ka: string; en: string; ru: string } | null | undefined,
) {
  if (!buttonLabel) {
    throw new ApiError(400, "სავალდებულოა ღილაკის ტექსტი (სამივე ენაზე)");
  }
}

function assertButtonLinkPresent(buttonLink: string | null | undefined) {
  if (!buttonLink || !buttonLink.trim()) {
    throw new ApiError(400, "CTA ტიპის სლაიდისთვის სავალდებულოა ღილაკის ბმული");
  }
}

async function assertDiscountTargetsExist(
  categoryId: number | null | undefined,
  productBrandId: number | null | undefined,
) {
  if (categoryId != null) {
    const category = await categoriesRepository.findById(categoryId);
    if (!category) {
      throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
    }
  }
  if (productBrandId != null) {
    const brand = await productBrandsRepository.findById(productBrandId);
    if (!brand) {
      throw new ApiError(400, "მითითებული ბრენდი არ არსებობს");
    }
  }
}

export async function listHeroSlides(onlyActive?: boolean) {
  const rows = await heroSlidesRepository.findMany(onlyActive);
  return rows.map(toResponse);
}

export async function getHeroSlide(id: number) {
  const row = await heroSlidesRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "სლაიდი ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createHeroSlide(input: CreateHeroSlideInput) {
  if (TYPES_WITH_BUTTON_LABEL.has(input.type)) {
    assertButtonLabelPresent(input.buttonLabel);
  }
  if (input.type === "CTA") {
    assertButtonLinkPresent(input.buttonLink);
  }
  if (input.type === "DISCOUNT") {
    await assertDiscountTargetsExist(input.discountCategoryId, input.discountProductBrandId);
  }

  const row = await heroSlidesRepository.create({
    type: input.type,
    titleKa: input.title.ka,
    titleEn: input.title.en,
    titleRu: input.title.ru,
    subtitleKa: input.subtitle?.ka ?? null,
    subtitleEn: input.subtitle?.en ?? null,
    subtitleRu: input.subtitle?.ru ?? null,
    buttonLabelKa: TYPES_WITH_BUTTON_LABEL.has(input.type) ? (input.buttonLabel?.ka ?? null) : null,
    buttonLabelEn: TYPES_WITH_BUTTON_LABEL.has(input.type) ? (input.buttonLabel?.en ?? null) : null,
    buttonLabelRu: TYPES_WITH_BUTTON_LABEL.has(input.type) ? (input.buttonLabel?.ru ?? null) : null,
    buttonLink: input.type === "CTA" ? (input.buttonLink ?? null) : null,
    discountCategoryId: input.type === "DISCOUNT" ? (input.discountCategoryId ?? null) : null,
    discountProductBrandId:
      input.type === "DISCOUNT" ? (input.discountProductBrandId ?? null) : null,
    textPosition: input.textPosition ?? "LEFT",
    verticalPosition: input.verticalPosition ?? "BOTTOM",
    isActive: input.isActive ?? true,
  });
  return toResponse(row);
}

export async function updateHeroSlide(id: number, input: UpdateHeroSlideInput) {
  const existing = await heroSlidesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "სლაიდი ვერ მოიძებნა");
  }

  const effectiveType = input.type ?? existing.type;

  if (TYPES_WITH_BUTTON_LABEL.has(effectiveType)) {
    const buttonLabel =
      input.buttonLabel !== undefined
        ? input.buttonLabel
        : existing.buttonLabelKa != null
          ? { ka: existing.buttonLabelKa, en: existing.buttonLabelEn as string, ru: existing.buttonLabelRu as string }
          : null;
    assertButtonLabelPresent(buttonLabel);
  }
  if (effectiveType === "CTA") {
    const buttonLink = input.buttonLink !== undefined ? input.buttonLink : existing.buttonLink;
    assertButtonLinkPresent(buttonLink);
  }
  if (effectiveType === "DISCOUNT") {
    const discountCategoryId =
      input.discountCategoryId !== undefined ? input.discountCategoryId : existing.discountCategoryId;
    const discountProductBrandId =
      input.discountProductBrandId !== undefined
        ? input.discountProductBrandId
        : existing.discountProductBrandId;
    await assertDiscountTargetsExist(discountCategoryId, discountProductBrandId);
  }

  const row = await heroSlidesRepository.update(id, {
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.title !== undefined
      ? { titleKa: input.title.ka, titleEn: input.title.en, titleRu: input.title.ru }
      : {}),
    ...(input.subtitle !== undefined
      ? {
          subtitleKa: input.subtitle?.ka ?? null,
          subtitleEn: input.subtitle?.en ?? null,
          subtitleRu: input.subtitle?.ru ?? null,
        }
      : {}),
    ...(input.buttonLabel !== undefined
      ? {
          buttonLabelKa: input.buttonLabel?.ka ?? null,
          buttonLabelEn: input.buttonLabel?.en ?? null,
          buttonLabelRu: input.buttonLabel?.ru ?? null,
        }
      : {}),
    ...(input.buttonLink !== undefined ? { buttonLink: input.buttonLink ?? null } : {}),
    ...(input.discountCategoryId !== undefined
      ? { discountCategoryId: input.discountCategoryId }
      : {}),
    ...(input.discountProductBrandId !== undefined
      ? { discountProductBrandId: input.discountProductBrandId }
      : {}),
    ...(input.textPosition !== undefined ? { textPosition: input.textPosition } : {}),
    ...(input.verticalPosition !== undefined ? { verticalPosition: input.verticalPosition } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    // Clear fields that don't belong to the effective type — placed last so
    // they win over the conditional spreads above.
    ...(TYPES_WITH_BUTTON_LABEL.has(effectiveType)
      ? {}
      : { buttonLabelKa: null, buttonLabelEn: null, buttonLabelRu: null }),
    ...(effectiveType === "CTA" ? {} : { buttonLink: null }),
    ...(effectiveType === "DISCOUNT" ? {} : { discountCategoryId: null, discountProductBrandId: null }),
  });
  return toResponse(row);
}

export async function setHeroSlideImage(id: number, file: Express.Multer.File) {
  const existing = await heroSlidesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "სლაიდი ვერ მოიძებნა");
  }

  const imageUrl = await saveUploadedImage("hero-slides", file);
  const row = await heroSlidesRepository.updateImage(id, imageUrl);
  void deleteUploadedImage(existing.imageUrl);
  return toResponse(row);
}

export async function reorderHeroSlides(input: ReorderHeroSlidesInput) {
  const existing = await heroSlidesRepository.findMany();
  const existingIds = new Set(existing.map((row) => row.id));

  if (input.ids.length !== existing.length || !input.ids.every((id) => existingIds.has(id))) {
    throw new ApiError(400, "მითითებული სლაიდების სია არ ემთხვევა არსებულს");
  }

  await heroSlidesRepository.reorder(input.ids);
  return listHeroSlides();
}

export async function deleteHeroSlide(id: number) {
  const existing = await heroSlidesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "სლაიდი ვერ მოიძებნა");
  }

  await heroSlidesRepository.delete(id);
}

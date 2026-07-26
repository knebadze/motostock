import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { saveUploadedImage } from "../../lib/storage.js";
import { brandsRepository } from "./brands.repository.js";
import type { CreateBrandInput, UpdateBrandInput } from "./brands.schema.js";

type BrandRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(brand: BrandRow) {
  return {
    id: brand.id,
    name: { ka: brand.nameKa, en: brand.nameEn, ru: brand.nameRu },
    slug: brand.slug,
    logoUrl: brand.logoUrl,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
}

export async function listBrands() {
  const brands = await brandsRepository.findMany();
  return brands.map(toResponse);
}

export async function getBrand(id: number) {
  const brand = await brandsRepository.findById(id);
  if (!brand) {
    throw new ApiError(404, "მარკა ვერ მოიძებნა");
  }
  return toResponse(brand);
}

export async function createBrand(input: CreateBrandInput) {
  const existing = await brandsRepository.findBySlug(input.slug);
  if (existing) {
    throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
  }

  const brand = await brandsRepository.create({
    nameKa: input.name.ka,
    nameEn: input.name.en,
    nameRu: input.name.ru,
    slug: input.slug,
  });
  return toResponse(brand);
}

export async function updateBrand(id: number, input: UpdateBrandInput) {
  const existing = await brandsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "მარკა ვერ მოიძებნა");
  }

  if (input.slug && input.slug !== existing.slug) {
    const bySlug = await brandsRepository.findBySlug(input.slug);
    if (bySlug) {
      throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
    }
  }

  const brand = await brandsRepository.update(id, {
    ...(input.name !== undefined
      ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
      : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
  });
  return toResponse(brand);
}

export async function setBrandLogo(id: number, file: Express.Multer.File) {
  const existing = await brandsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "მარკა ვერ მოიძებნა");
  }

  const logoUrl = await saveUploadedImage("brands", file);
  const brand = await brandsRepository.updateLogo(id, logoUrl);
  return toResponse(brand);
}

export async function deleteBrand(id: number) {
  const existing = await brandsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "მარკა ვერ მოიძებნა");
  }

  try {
    await brandsRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        400,
        "მარკა გამოიყენება მოდელებში ან ტექნიკის კატალოგში, ჯერ წაშალეთ დამოკიდებული ჩანაწერები",
      );
    }
    throw error;
  }
}

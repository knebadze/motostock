import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation, runUniqueCheckedWrite } from "../../lib/prismaErrors.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { resolvePage } from "../../lib/pagination.js";
import { applyBrandAdminFilters } from "../filters/brand/brand-filter-registry.js";
import { brandsRepository } from "./brands.repository.js";
import type { BrandListQuery, CreateBrandInput, UpdateBrandInput } from "./brands.schema.js";

type BrandRow = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(brand: BrandRow) {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
}

const DEFAULT_PAGE_SIZE = 20;

// page/pageSize only trigger real pagination when the caller sends at least
// one of them (see brandListQuerySchema) — every brand/model picker across
// the admin panel calls this with neither and keeps getting the full,
// unbounded list.
export async function listBrands(query: BrandListQuery = {}) {
  const where = applyBrandAdminFilters(query.adminFilters);

  if (query.page == null && query.pageSize == null) {
    const brands = await brandsRepository.findMany(where);
    const items = brands.map(toResponse);
    return { items, total: items.length, page: 1, pageSize: items.length || DEFAULT_PAGE_SIZE };
  }

  const { page, pageSize, skip, take } = resolvePage(query, DEFAULT_PAGE_SIZE);
  const [rows, total] = await Promise.all([
    brandsRepository.findMany(where, skip, take),
    brandsRepository.count(where),
  ]);
  return { items: rows.map(toResponse), total, page, pageSize };
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

  const brand = await runUniqueCheckedWrite(
    () => brandsRepository.create({ name: input.name, slug: input.slug }),
    "slug",
    "ეს slug უკვე გამოყენებულია",
  );
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

  const brand = await runUniqueCheckedWrite(
    () =>
      brandsRepository.update(id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
      }),
    "slug",
    "ეს slug უკვე გამოყენებულია",
  );
  return toResponse(brand);
}

export async function setBrandLogo(id: number, file: Express.Multer.File) {
  const existing = await brandsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "მარკა ვერ მოიძებნა");
  }

  const logoUrl = await saveUploadedImage("brands", file);
  const brand = await brandsRepository.updateLogo(id, logoUrl);
  void deleteUploadedImage(existing.logoUrl);
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
  void deleteUploadedImage(existing.logoUrl);
}

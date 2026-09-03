import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { productBrandsRepository } from "./product-brands.repository.js";
import type { CreateProductBrandInput, UpdateProductBrandInput } from "./product-brands.schema.js";

type CategoryRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };

type ProductBrandRow = {
  id: number;
  category: CategoryRefRow;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toCategoryRef(row: CategoryRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function toResponse(row: ProductBrandRow) {
  return {
    id: row.id,
    category: toCategoryRef(row.category),
    name: row.name,
    slug: row.slug,
    logoUrl: row.logoUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertCategoryExists(categoryId: number) {
  const category = await categoriesRepository.findById(categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }
}

export async function listProductBrands(categoryId?: number) {
  const categoryIds = categoryId != null ? await resolveCategoryAndAncestorIds(categoryId) : undefined;
  const rows = await productBrandsRepository.findMany(categoryIds);
  return rows.map(toResponse);
}

export async function getProductBrand(id: number) {
  const row = await productBrandsRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "ბრენდი ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createProductBrand(input: CreateProductBrandInput) {
  await assertCategoryExists(input.categoryId);

  const existing = await productBrandsRepository.findBySlug(input.slug);
  if (existing) {
    throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
  }

  const row = await productBrandsRepository.create({
    categoryId: input.categoryId,
    name: input.name,
    slug: input.slug,
  });
  return toResponse(row);
}

export async function updateProductBrand(id: number, input: UpdateProductBrandInput) {
  const existing = await productBrandsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ბრენდი ვერ მოიძებნა");
  }

  if (input.categoryId !== undefined) {
    await assertCategoryExists(input.categoryId);
  }

  if (input.slug && input.slug !== existing.slug) {
    const bySlug = await productBrandsRepository.findBySlug(input.slug);
    if (bySlug) {
      throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
    }
  }

  const row = await productBrandsRepository.update(id, {
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
  });
  return toResponse(row);
}

export async function setProductBrandLogo(id: number, file: Express.Multer.File) {
  const existing = await productBrandsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ბრენდი ვერ მოიძებნა");
  }

  const logoUrl = await saveUploadedImage("product-brands", file);
  const row = await productBrandsRepository.updateLogo(id, logoUrl);
  void deleteUploadedImage(existing.logoUrl);
  return toResponse(row);
}

export async function deleteProductBrand(id: number) {
  const existing = await productBrandsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ბრენდი ვერ მოიძებნა");
  }

  try {
    await productBrandsRepository.delete(id);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        400,
        "ბრენდი გამოიყენება პროდუქტებში, ჯერ წაშალეთ დამოკიდებული ჩანაწერები",
      );
    }
    throw error;
  }
  void deleteUploadedImage(existing.logoUrl);
}

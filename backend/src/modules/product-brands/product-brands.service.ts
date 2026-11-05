import type { Prisma } from "../../generated/prisma/index.js";
import { ApiError } from "../../lib/ApiError.js";
import { isForeignKeyViolation, runUniqueCheckedWrite } from "../../lib/prismaErrors.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { resolvePage } from "../../lib/pagination.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { applyProductBrandAdminFilters } from "../filters/product-brand/product-brand-filter-registry.js";
import { productBrandsRepository } from "./product-brands.repository.js";
import type {
  CreateProductBrandInput,
  ProductBrandListQuery,
  UpdateProductBrandInput,
} from "./product-brands.schema.js";

type CategoryRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };

type ProductBrandRow = {
  id: number;
  categories: { category: CategoryRefRow }[];
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
    categories: row.categories.map((link) => toCategoryRef(link.category)),
    name: row.name,
    slug: row.slug,
    logoUrl: row.logoUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertCategoriesExist(categoryIds: number[]) {
  if (categoryIds.length === 0) {
    throw new ApiError(400, "მინიმუმ ერთი კატეგორია უნდა იყოს მითითებული");
  }
  const uniqueIds = [...new Set(categoryIds)];
  const found = await categoriesRepository.findMany({ id: { in: uniqueIds } });
  if (found.length !== uniqueIds.length) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }
}

const DEFAULT_PAGE_SIZE = 20;

// `categoryId` (ancestor-inclusive scope) and `adminFilters` combine with
// AND when both are sent — in practice only the admin list screen sends
// adminFilters, and only ProductForm/PromoCodeFormModal send categoryId, so
// this never actually happens, but it's the correct behavior either way.
// page/pageSize only trigger real pagination when the caller sends at least
// one of them — every other caller keeps getting the full, unbounded list.
export async function listProductBrands(query: ProductBrandListQuery = {}) {
  const [scopeCategoryIds, adminWhere] = await Promise.all([
    query.categoryId != null ? resolveCategoryAndAncestorIds(query.categoryId) : null,
    Promise.resolve(applyProductBrandAdminFilters(query.adminFilters)),
  ]);
  const scopeWhere: Prisma.ProductBrandWhereInput | undefined = scopeCategoryIds
    ? { categories: { some: { categoryId: { in: scopeCategoryIds } } } }
    : undefined;
  const where: Prisma.ProductBrandWhereInput | undefined =
    scopeWhere && adminWhere ? { AND: [scopeWhere, adminWhere] } : scopeWhere ?? adminWhere;

  if (query.page == null && query.pageSize == null) {
    const rows = await productBrandsRepository.findMany(where);
    const items = rows.map(toResponse);
    return { items, total: items.length, page: 1, pageSize: items.length || DEFAULT_PAGE_SIZE };
  }

  const { page, pageSize, skip, take } = resolvePage(query, DEFAULT_PAGE_SIZE);
  const [rows, total] = await Promise.all([
    productBrandsRepository.findMany(where, skip, take),
    productBrandsRepository.count(where),
  ]);
  return { items: rows.map(toResponse), total, page, pageSize };
}

export async function getProductBrand(id: number) {
  const row = await productBrandsRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "ბრენდი ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createProductBrand(input: CreateProductBrandInput) {
  await assertCategoriesExist(input.categoryIds);

  const existing = await productBrandsRepository.findBySlug(input.slug);
  if (existing) {
    throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
  }

  const row = await runUniqueCheckedWrite(
    () =>
      productBrandsRepository.create({
        categoryIds: input.categoryIds,
        name: input.name,
        slug: input.slug,
      }),
    "slug",
    "ეს slug უკვე გამოყენებულია",
  );
  return toResponse(row);
}

export async function updateProductBrand(id: number, input: UpdateProductBrandInput) {
  const existing = await productBrandsRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ბრენდი ვერ მოიძებნა");
  }

  if (input.categoryIds !== undefined) {
    await assertCategoriesExist(input.categoryIds);
  }

  if (input.slug && input.slug !== existing.slug) {
    const bySlug = await productBrandsRepository.findBySlug(input.slug);
    if (bySlug) {
      throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
    }
  }

  const row = await runUniqueCheckedWrite(
    () =>
      productBrandsRepository.update(id, {
        ...(input.categoryIds !== undefined ? { categoryIds: input.categoryIds } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
      }),
    "slug",
    "ეს slug უკვე გამოყენებულია",
  );
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

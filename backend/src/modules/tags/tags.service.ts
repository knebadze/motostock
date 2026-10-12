import { ApiError } from "../../lib/ApiError.js";
import { runUniqueCheckedWrite } from "../../lib/prismaErrors.js";
import { productsRepository } from "../products/products.repository.js";
import { tagsRepository } from "./tags.repository.js";
import type { CreateTagInput, UpdateTagInput } from "./tags.schema.js";

const DUPLICATE_NAME_MESSAGE = "ასეთი ტეგი უკვე არსებობს";
// The DB-level guarantee (see the migration's lower(btrim(name)) index).
const NAME_UNIQUE_INDEX_HINT = "Tag_name_normalized_key";

type TagRow = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { products: number };
};

function toResponse(row: TagRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    productCount: row._count.products,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Collapses inner whitespace too, so "ზეთის  შეცვლა" and "ზეთის შეცვლა"
// are the same tag.
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeDescription(description: string | null | undefined): string | null | undefined {
  if (description === undefined) return undefined;
  const trimmed = description?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

async function assertNameAvailable(name: string, exceptId?: number) {
  const existing = await tagsRepository.findByNameInsensitive(name);
  if (existing && existing.id !== exceptId) {
    throw new ApiError(409, DUPLICATE_NAME_MESSAGE);
  }
}

async function findTagOr404(id: number) {
  const row = await tagsRepository.findById(id);
  if (!row) throw new ApiError(404, "ტეგი ვერ მოიძებნა");
  return row;
}

export async function listTags() {
  const rows = await tagsRepository.findMany();
  return rows.map(toResponse);
}

export async function createTag(input: CreateTagInput) {
  const name = normalizeName(input.name);
  await assertNameAvailable(name);
  const row = await runUniqueCheckedWrite(
    () =>
      tagsRepository.create({
        name,
        description: normalizeDescription(input.description) ?? null,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      }),
    NAME_UNIQUE_INDEX_HINT,
    DUPLICATE_NAME_MESSAGE,
  );
  return toResponse(row);
}

export async function updateTag(id: number, input: UpdateTagInput) {
  await findTagOr404(id);
  const name = input.name !== undefined ? normalizeName(input.name) : undefined;
  if (name !== undefined) await assertNameAvailable(name, id);
  const description = normalizeDescription(input.description);
  const row = await runUniqueCheckedWrite(
    () =>
      tagsRepository.update(id, {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      }),
    NAME_UNIQUE_INDEX_HINT,
    DUPLICATE_NAME_MESSAGE,
  );
  return toResponse(row);
}

// Removes the tag from every product too (ProductTag cascades) — the admin
// UI confirms this with the product count first.
export async function deleteTag(id: number) {
  await findTagOr404(id);
  await tagsRepository.delete(id);
}

export async function listTagProducts(id: number) {
  await findTagOr404(id);
  const rows = await tagsRepository.findProducts(id);
  return rows.map((row) => ({
    id: row.id,
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    slug: row.slug,
    imageUrl: row.imageUrl,
    category: {
      id: row.category.id,
      name: { ka: row.category.nameKa, en: row.category.nameEn, ru: row.category.nameRu },
      slug: row.category.slug,
    },
  }));
}

async function assertProductsExist(productIds: number[]) {
  if ((await tagsRepository.countProductsByIds(productIds)) !== productIds.length) {
    throw new ApiError(400, "ზოგიერთი მონიშნული პროდუქტი აღარ არსებობს — განაახლეთ სია");
  }
}

// Bulk assign from the admin products list — already-tagged products are
// skipped (no error).
export async function addTagToProducts(tagId: number, productIds: number[]) {
  await findTagOr404(tagId);
  const uniqueIds = [...new Set(productIds)];
  await assertProductsExist(uniqueIds);
  const { count } = await tagsRepository.addTagToProducts(tagId, uniqueIds);
  return { changed: count, tag: toResponse(await findTagOr404(tagId)) };
}

export async function removeTagFromProducts(tagId: number, productIds: number[]) {
  await findTagOr404(tagId);
  const { count } = await tagsRepository.removeTagFromProducts(tagId, [...new Set(productIds)]);
  return { changed: count, tag: toResponse(await findTagOr404(tagId)) };
}

async function assertProductExists(productId: number) {
  const product = await productsRepository.findById(productId);
  if (!product) throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
}

export async function getProductTags(productId: number) {
  await assertProductExists(productId);
  return tagsRepository.findProductTags(productId);
}

export async function setProductTags(productId: number, tagIds: number[]) {
  await assertProductExists(productId);
  const uniqueIds = [...new Set(tagIds)];
  if (uniqueIds.length > 0 && (await tagsRepository.countByIds(uniqueIds)) !== uniqueIds.length) {
    throw new ApiError(400, "მითითებული ტეგი არ არსებობს");
  }
  await tagsRepository.replaceProductTags(productId, uniqueIds);
  return tagsRepository.findProductTags(productId);
}

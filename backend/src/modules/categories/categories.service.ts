import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/index.js";
import { cache } from "../../lib/cache.js";
import { ApiError } from "../../lib/ApiError.js";
import { runUniqueCheckedWrite } from "../../lib/prismaErrors.js";
import { isForeignKeyViolation } from "../../lib/prismaErrors.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
import { applyCategoryAdminFilters } from "../filters/category/category-filter-registry.js";
import { categoriesRepository } from "./categories.repository.js";
import { recordSlugRename } from "../slug-redirects/slug-redirects.service.js";
import type {
  CategoryListQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./categories.schema.js";
import { invalidateVehicleCatalogOptions } from "../vehicle-catalog/vehicle-catalog-options-cache.js";
import { getCategoryTree, invalidateCategoryTree, loadCategoryTree, type CategoryTreeNode } from "./category-tree-cache.js";

type CategoryRow = {
  id: number;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  menuImageUrl: string | null;
  sortOrder: number;
  lowStockBadgeEnabled: boolean;
  onlinePurchaseEnabled: boolean;
  vehicleFitmentEnabled: boolean;
  inheritsAttributes: boolean;
  sizeScaleId: number | null;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  parent?: { id: number; nameKa: string; nameEn: string; nameRu: string } | null;
};

function toResponse(category: CategoryRow) {
  return {
    id: category.id,
    name: { ka: category.nameKa, en: category.nameEn, ru: category.nameRu },
    slug: category.slug,
    imageUrl: category.imageUrl,
    bannerImageUrl: category.bannerImageUrl,
    menuImageUrl: category.menuImageUrl,
    sortOrder: category.sortOrder,
    lowStockBadgeEnabled: category.lowStockBadgeEnabled,
    onlinePurchaseEnabled: category.onlinePurchaseEnabled,
    vehicleFitmentEnabled: category.vehicleFitmentEnabled,
    inheritsAttributes: category.inheritsAttributes,
    sizeScaleId: category.sizeScaleId,
    parentId: category.parentId,
    parent: category.parent
      ? {
          id: category.parent.id,
          name: {
            ka: category.parent.nameKa,
            en: category.parent.nameEn,
            ru: category.parent.nameRu,
          },
        }
      : null,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

const ITEM_COUNTS_CACHE_KEY = "categories:item-counts";

// Drops the cached counts — called after every write that can change them
// (category tree, products, variants, vehicle listings), so the storefront
// (category menu, subcategory filter, homepage section) sees new items at
// once. The admin "clear cache" button (cache.clear()) drops it too.
export function invalidateCategoryItemCounts() {
  cache.del(ITEM_COUNTS_CACHE_KEY);
}

// Per-category storefront item counts, each ROLLED UP over its whole
// subtree (a parent shows everything under it — products, or vehicle
// listings for transport categories), for the homepage categories section.
// Cached with no expiry (a full-table aggregate): dropped by
// invalidateCategoryItemCounts on every write that changes a count, and by
// the admin "clear cache" button.
// Via cache.getOrLoad, so a count computed while a write invalidated it
// (e.g. a product added mid-read) is returned but not stored.
export function getCategoryItemCounts(): Promise<{ categoryId: number; count: number }[]> {
  return cache.getOrLoad(ITEM_COUNTS_CACHE_KEY, computeCategoryItemCounts);
}

async function computeCategoryItemCounts(): Promise<{ categoryId: number; count: number }[]> {
  const [tree, direct] = await Promise.all([
    getCategoryTree(),
    categoriesRepository.countItemsPerCategory(),
  ]);
  const parentById = new Map(tree.map((row) => [row.id, row.parentId]));
  const totals = new Map<number, number>(tree.map((row) => [row.id, 0]));
  for (const { categoryId, count } of direct) {
    // Add to the category and every ancestor (guarding against a cycle).
    const seen = new Set<number>();
    let current: number | null | undefined = categoryId;
    while (current != null && !seen.has(current) && totals.has(current)) {
      seen.add(current);
      totals.set(current, (totals.get(current) ?? 0) + count);
      current = parentById.get(current);
    }
  }
  return [...totals].map(([categoryId, count]) => ({ categoryId, count }));
}

// The size scale a category's products use: its own, else the nearest
// ancestor's (see Category.sizeScaleId) — null when none is set anywhere.
export async function resolveSizeScale(categoryId: number) {
  const all = await getCategoryTree();
  const byId = new Map(all.map((category) => [category.id, category]));
  const seen = new Set<number>();
  let current = byId.get(categoryId);
  while (current && !seen.has(current.id)) {
    if (current.sizeScaleId != null) {
      return prisma.sizeScale.findUnique({ where: { id: current.sizeScaleId } });
    }
    seen.add(current.id);
    current = current.parentId != null ? byId.get(current.parentId) : undefined;
  }
  return null;
}

type InheritedFlag = "onlinePurchaseEnabled" | "vehicleFitmentEnabled";

// Ids of every category where `flag` is effectively off: switched off
// itself, or under a switched-off ancestor (so turning it off on "Transport"
// covers all its subcategories).
async function getCategoryIdsWithFlagOff(flag: InheritedFlag): Promise<Set<number>> {
  const rows = await getCategoryTree();
  const byId = new Map(rows.map((row) => [row.id, row]));
  const off = new Set<number>();
  for (const row of rows) {
    // Walk up to the root; `seen` guards against a (should-be-impossible,
    // see assertNoCycle) parent cycle.
    const seen = new Set<number>();
    let current: typeof row | undefined = row;
    while (current && !seen.has(current.id)) {
      if (!current[flag]) {
        off.add(row.id);
        break;
      }
      seen.add(current.id);
      current = current.parentId != null ? byId.get(current.parentId) : undefined;
    }
  }
  return off;
}

// Categories whose items can't be bought on the site (cart/checkout).
export function getOnlinePurchaseBlockedCategoryIds(): Promise<Set<number>> {
  return getCategoryIdsWithFlagOff("onlinePurchaseEnabled");
}

// Categories whose products are vehicle-independent (no fitment) — see
// products.service.ts's buildVehicleCompatibilityWhere.
export function getVehicleFitmentDisabledCategoryIds(): Promise<Set<number>> {
  return getCategoryIdsWithFlagOff("vehicleFitmentEnabled");
}

// Admin fitment/fitment-rule writes on a product in such a category.
export async function assertCategoryVehicleFitmentEnabled(categoryId: number) {
  if ((await getVehicleFitmentDisabledCategoryIds()).has(categoryId)) {
    throw new ApiError(
      400,
      "ამ კატეგორიისთვის ტრანსპორტთან თავსებადობა გამორთულია (კატეგორიის პარამეტრებში)",
      "VEHICLE_FITMENT_DISABLED_FOR_CATEGORY",
    );
  }
}

async function assertNoCycle(categoryId: number, proposedParentId: number) {
  if (proposedParentId === categoryId) {
    throw new ApiError(400, "კატეგორია საკუთარი თავის მშობელი ვერ იქნება");
  }

  let currentId: number | null = proposedParentId;
  while (currentId !== null) {
    if (currentId === categoryId) {
      throw new ApiError(400, "მშობელი ვერ იქნება საკუთარი შვილობილი კატეგორია");
    }
    const current = await categoriesRepository.findById(currentId);
    currentId = current?.parentId ?? null;
  }
}

async function assertParentExists(parentId: number) {
  const parent = await categoriesRepository.findById(parentId);
  if (!parent) {
    throw new ApiError(400, "მითითებული მშობელი კატეგორია არ არსებობს");
  }
}

export async function listCategories(query: CategoryListQuery = {}) {
  const where = applyCategoryAdminFilters(query.adminFilters);
  const categories = await categoriesRepository.findMany(where);
  return categories.map(toResponse);
}

// Resolves categoryId + every descendant category id (opposite direction from
// the parent-walking used by assertNoCycle above). Products and vehicle
// listings are only ever seeded on leaf categories, so browsing a parent
// category (e.g. "transport") must still surface items from its children.
// One findMany() call builds a parentId -> children[] map in memory, then a
// single BFS from categoryId — no per-level DB round trips.
//
// `preloadedCategories` lets a caller that needs this for SEVERAL
// categoryIds in a row (e.g. compatibility.service.ts's per-CATEGORY-rule
// loop) fetch the table once and pass it into every call, instead of each
// call independently refetching the whole categories table — every
// single-category caller omits it and gets the previous one-fetch-per-call
// behavior unchanged.
export async function resolveCategoryAndDescendantIds(
  categoryId: number,
  preloadedCategories?: { id: number; parentId: number | null }[],
): Promise<number[]> {
  const allCategories = preloadedCategories ?? (await getCategoryTree());
  const childrenByParentId = new Map<number, number[]>();
  for (const category of allCategories) {
    if (category.parentId == null) continue;
    const siblings = childrenByParentId.get(category.parentId) ?? [];
    siblings.push(category.id);
    childrenByParentId.set(category.parentId, siblings);
  }

  const result: number[] = [];
  const queue = [categoryId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    queue.push(...(childrenByParentId.get(current) ?? []));
  }
  return result;
}

export async function getCategory(id: number) {
  const category = await categoriesRepository.findById(id);
  if (!category) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }
  return toResponse(category);
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await categoriesRepository.findBySlug(input.slug);
  if (existing) {
    throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
  }

  if (input.parentId != null) {
    await assertParentExists(input.parentId);
  }

  const category = await runUniqueCheckedWrite(
    () =>
      categoriesRepository.create({
        nameKa: input.name.ka,
        nameEn: input.name.en,
        nameRu: input.name.ru,
        slug: input.slug,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? 0,
        ...(input.lowStockBadgeEnabled !== undefined
          ? { lowStockBadgeEnabled: input.lowStockBadgeEnabled }
          : {}),
        ...(input.onlinePurchaseEnabled !== undefined
          ? { onlinePurchaseEnabled: input.onlinePurchaseEnabled }
          : {}),
        ...(input.vehicleFitmentEnabled !== undefined
          ? { vehicleFitmentEnabled: input.vehicleFitmentEnabled }
          : {}),
        ...(input.inheritsAttributes !== undefined ? { inheritsAttributes: input.inheritsAttributes } : {}),
        ...(input.sizeScaleId !== undefined ? { sizeScaleId: input.sizeScaleId } : {}),
      }),
    "slug",
    "ეს slug უკვე გამოყენებულია",
  );

  invalidateCategoryTree();
  invalidateCategoryItemCounts();
  return toResponse(category);
}

export async function updateCategory(id: number, input: UpdateCategoryInput) {
  const existing = await categoriesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }

  if (input.slug && input.slug !== existing.slug) {
    const bySlug = await categoriesRepository.findBySlug(input.slug);
    if (bySlug) {
      throw new ApiError(409, "ეს slug უკვე გამოყენებულია");
    }
  }

  if (input.parentId !== undefined && input.parentId !== null) {
    await assertParentExists(input.parentId);
    await assertNoCycle(id, input.parentId);
  }

  // A parent / inheritsAttributes change: product values for attributes
  // that no longer apply in the subtree are deleted with the update (the
  // admin confirmed this after previewCategoryAttributeImpact) — planned
  // inside the update's transaction from the tree as it is in the DB.
  const planAttributeCleanup = (tx: Prisma.TransactionClient) =>
    planAttributeScope(id, { parentId: input.parentId, inheritsAttributes: input.inheritsAttributes }, tx);

  const category = await runUniqueCheckedWrite(
    () =>
      categoriesRepository.update(id, {
        ...(input.name !== undefined
          ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
          : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.lowStockBadgeEnabled !== undefined
          ? { lowStockBadgeEnabled: input.lowStockBadgeEnabled }
          : {}),
        ...(input.onlinePurchaseEnabled !== undefined
          ? { onlinePurchaseEnabled: input.onlinePurchaseEnabled }
          : {}),
        ...(input.vehicleFitmentEnabled !== undefined
          ? { vehicleFitmentEnabled: input.vehicleFitmentEnabled }
          : {}),
        ...(input.inheritsAttributes !== undefined ? { inheritsAttributes: input.inheritsAttributes } : {}),
        ...(input.sizeScaleId !== undefined ? { sizeScaleId: input.sizeScaleId } : {}),
      }, planAttributeCleanup),
    "slug",
    "ეს slug უკვე გამოყენებულია",
  );

  // Old URL keeps working — 301 to the new slug (see slug-redirects).
  if (input.slug && input.slug !== existing.slug) {
    await recordSlugRename("CATEGORY", id, existing.slug, input.slug);
  }

  invalidateVehicleCatalogOptions();
  invalidateCategoryTree();
  invalidateCategoryItemCounts();
  return toResponse(category);
}

type AttributeScopeChange = { parentId?: number | null; inheritsAttributes?: boolean };

// Which attribute-defining categories apply to `categoryId` in `byId` —
// same walk as attributes.service.ts's resolveAttributeCategoryIds, on a
// tree that may carry a not-yet-saved change.
function attributeCategoryIdsIn(byId: Map<number, CategoryTreeNode>, categoryId: number): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  let current = byId.get(categoryId);
  while (current && !seen.has(current.id)) {
    ids.push(current.id);
    seen.add(current.id);
    if (!current.inheritsAttributes || current.parentId === null) break;
    current = byId.get(current.parentId);
  }
  return ids;
}

// What a parent / inheritsAttributes change on category `id` does to its
// subtree's product attribute values: per subtree category, the attribute
// categories that apply before and after. Null when neither field changes.
// Reads the tree straight from the DB (never the permanent cache): it
// decides which product data gets deleted, so a cache left stale by a seed
// or direct SQL edit must not steer it.
async function planAttributeScope(
  id: number,
  change: AttributeScopeChange,
  db: typeof prisma | Prisma.TransactionClient = prisma,
) {
  const tree = await loadCategoryTree(db);
  const before = new Map(tree.map((node) => [node.id, node]));
  const node = before.get(id);
  if (!node) return null;
  const parentChanges = change.parentId !== undefined && change.parentId !== node.parentId;
  const inheritChanges = change.inheritsAttributes !== undefined && change.inheritsAttributes !== node.inheritsAttributes;
  if (!parentChanges && !inheritChanges) return null;

  const after = new Map(before);
  after.set(id, {
    ...node,
    ...(parentChanges ? { parentId: change.parentId ?? null } : {}),
    ...(inheritChanges ? { inheritsAttributes: change.inheritsAttributes! } : {}),
  });
  const subtree = await resolveCategoryAndDescendantIds(id, tree);
  return subtree.map((categoryId) => ({
    categoryId,
    before: attributeCategoryIdsIn(before, categoryId),
    allowedAttributeCategoryIds: attributeCategoryIdsIn(after, categoryId),
  }));
}

// Dry run of the same change, for the admin's confirmation: the product
// values that would be deleted (attributes that no longer apply), and the
// newly applying REQUIRED attributes existing products don't have yet
// (they'd have to fill those in on their next save).
export async function previewCategoryAttributeImpact(id: number, change: AttributeScopeChange) {
  const existing = await categoriesRepository.findById(id);
  if (!existing) throw new ApiError(404, "კატეგორია ვერ მოიძებნა");

  const [plan, move] = await Promise.all([
    planAttributeScope(id, change),
    change.parentId !== undefined && change.parentId !== existing.parentId
      ? previewCategoryMoveImpact(id, change.parentId)
      : null,
  ]);
  const moveImpact = move ?? { sizeScaleChanges: [], brandMismatch: { productCount: 0, brands: [] } };
  const empty = { removedValueCount: 0, affectedProductCount: 0, removedAttributes: [], newlyRequired: [], ...moveImpact };
  if (!plan) return empty;

  // Values to delete — one grouped query over every subtree category
  // (OR of per-category scopes), not one query per category.
  const scopes = plan.map((scope) => ({
    product: { categoryId: scope.categoryId },
    attribute: { categoryId: { notIn: scope.allowedAttributeCategoryIds } },
  }));
  const [removedByAttribute, affectedProducts] = await Promise.all([
    prisma.productAttributeValue.groupBy({ by: ["attributeId"], where: { OR: scopes }, _count: { _all: true } }),
    prisma.productAttributeValue.groupBy({ by: ["productId"], where: { OR: scopes } }),
  ]);
  const removedAttributeNames = new Map(
    (
      await prisma.attribute.findMany({
        where: { id: { in: removedByAttribute.map((row) => row.attributeId) } },
        select: { id: true, nameKa: true },
      })
    ).map((attribute) => [attribute.id, attribute.nameKa]),
  );

  // Newly applying required attributes: per attribute, the subtree
  // categories that gain it — one attribute lookup for all of them, then one
  // count per attribute (over all its categories at once), not per
  // (category × attribute).
  const gainedByCategory = plan
    .map((scope) => ({
      categoryId: scope.categoryId,
      gained: scope.allowedAttributeCategoryIds.filter((categoryId) => !scope.before.includes(categoryId)),
    }))
    .filter((scope) => scope.gained.length > 0);
  const requiredAttributes =
    gainedByCategory.length > 0
      ? await prisma.attribute.findMany({
          where: { categoryId: { in: [...new Set(gainedByCategory.flatMap((scope) => scope.gained))] }, required: true },
          select: { id: true, nameKa: true, categoryId: true },
        })
      : [];
  const newlyRequired = (
    await Promise.all(
      requiredAttributes.map(async (attribute) => {
        const categoryIds = gainedByCategory
          .filter((scope) => scope.gained.includes(attribute.categoryId))
          .map((scope) => scope.categoryId);
        const missingProductCount = await prisma.product.count({
          where: { categoryId: { in: categoryIds }, attributeValues: { none: { attributeId: attribute.id } } },
        });
        return { id: attribute.id, name: attribute.nameKa, missingProductCount };
      }),
    )
  ).filter((attribute) => attribute.missingProductCount > 0);

  return {
    removedValueCount: removedByAttribute.reduce((sum, row) => sum + row._count._all, 0),
    affectedProductCount: affectedProducts.length,
    removedAttributes: removedByAttribute.map((row) => ({
      id: row.attributeId,
      name: removedAttributeNames.get(row.attributeId) ?? "",
    })),
    newlyRequired,
    ...moveImpact,
  };
}

// The rest of what moving category `id` under `parentId` changes for its
// subtree, besides attributes (shown in the same confirmation):
// - the size scale, where a category has none of its own and inherits it —
//   with how many variants then have a size outside the new scale (their
//   size stays, but the product form only offers the new scale's sizes);
// - brands: products whose brand is linked only through the OLD ancestors,
//   so it no longer belongs to the product's category (the product keeps it
//   until the brand is changed — products.service.ts's brand check).
async function previewCategoryMoveImpact(id: number, parentId: number | null) {
  const tree = await loadCategoryTree();
  const before = new Map(tree.map((node) => [node.id, node]));
  const node = before.get(id);
  if (!node) return null;
  const after = new Map(before);
  after.set(id, { ...node, parentId });

  const chain = (byId: Map<number, CategoryTreeNode>, categoryId: number) => {
    const ids: number[] = [];
    const seen = new Set<number>();
    let current = byId.get(categoryId);
    while (current && !seen.has(current.id)) {
      ids.push(current.id);
      seen.add(current.id);
      current = current.parentId != null ? byId.get(current.parentId) : undefined;
    }
    return ids;
  };
  const effectiveScale = (byId: Map<number, CategoryTreeNode>, categoryId: number) => {
    for (const ancestorId of chain(byId, categoryId)) {
      const scaleId = byId.get(ancestorId)?.sizeScaleId;
      if (scaleId != null) return scaleId;
    }
    return null;
  };

  const subtree = await resolveCategoryAndDescendantIds(id, tree);

  // Size scale: group the subtree's categories by (old scale → new scale).
  const scaleMoves = new Map<string, { from: number | null; to: number | null; categoryIds: number[] }>();
  for (const categoryId of subtree) {
    const from = effectiveScale(before, categoryId);
    const to = effectiveScale(after, categoryId);
    if (from === to) continue;
    const key = `${from}:${to}`;
    const entry = scaleMoves.get(key) ?? { from, to, categoryIds: [] };
    entry.categoryIds.push(categoryId);
    scaleMoves.set(key, entry);
  }
  const scaleIds = [...new Set([...scaleMoves.values()].flatMap((move) => [move.from, move.to]))].filter(
    (scaleId): scaleId is number => scaleId != null,
  );
  const scaleNames = new Map(
    (await prisma.sizeScale.findMany({ where: { id: { in: scaleIds } }, select: { id: true, nameKa: true } })).map(
      (scale) => [scale.id, scale.nameKa],
    ),
  );
  const sizeScaleChanges = await Promise.all(
    [...scaleMoves.values()].map(async (move) => ({
      from: move.from != null ? (scaleNames.get(move.from) ?? null) : null,
      to: move.to != null ? (scaleNames.get(move.to) ?? null) : null,
      categoryCount: move.categoryIds.length,
      // Variants with a size the new scale doesn't contain (any size, when
      // the new place has no scale at all).
      variantsOutsideScale: await prisma.productVariant.count({
        where: {
          product: { categoryId: { in: move.categoryIds } },
          sizeId: { not: null },
          ...(move.to != null ? { NOT: { size: { scaleId: move.to } } } : {}),
        },
      }),
    })),
  );

  // Brands: products whose brand fits the category before the move but not after.
  const products = await prisma.product.findMany({
    where: { categoryId: { in: subtree }, productBrandId: { not: null } },
    select: {
      categoryId: true,
      productBrand: { select: { id: true, name: true, categories: { select: { categoryId: true } } } },
    },
  });
  const lostBrands = new Map<number, string>();
  let productCount = 0;
  for (const product of products) {
    const brand = product.productBrand;
    if (!brand) continue;
    const linked = new Set(brand.categories.map((link) => link.categoryId));
    const fitsBefore = chain(before, product.categoryId).some((categoryId) => linked.has(categoryId));
    const fitsAfter = chain(after, product.categoryId).some((categoryId) => linked.has(categoryId));
    if (fitsBefore && !fitsAfter) {
      productCount += 1;
      lostBrands.set(brand.id, brand.name);
    }
  }

  return {
    sizeScaleChanges,
    brandMismatch: {
      productCount,
      brands: [...lostBrands].map(([brandId, name]) => ({ id: brandId, name })),
    },
  };
}

export async function deleteCategory(id: number) {
  const existing = await categoriesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }

  const childrenCount = await categoriesRepository.countChildren(id);
  if (childrenCount > 0) {
    throw new ApiError(400, "ჯერ წაშალეთ ან გადაანაცვლეთ შვილობილი კატეგორიები");
  }

  try {
    await categoriesRepository.delete(id);
    invalidateCategoryTree();
    invalidateCategoryItemCounts();
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        400,
        "კატეგორია გამოიყენება მოდელებში ან ტექნიკის კატალოგში, ჯერ წაშალეთ დამოკიდებული ჩანაწერები",
      );
    }
    throw error;
  }
  void deleteUploadedImage(existing.imageUrl);
  void deleteUploadedImage(existing.bannerImageUrl);
  void deleteUploadedImage(existing.menuImageUrl);
}

export async function setCategoryImage(id: number, file: Express.Multer.File) {
  const existing = await categoriesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }

  const imageUrl = await saveUploadedImage("categories", file);
  const category = await categoriesRepository.updateImage(id, imageUrl);
  void deleteUploadedImage(existing.imageUrl);
  return toResponse(category);
}

export async function setCategoryBannerImage(id: number, file: Express.Multer.File) {
  const existing = await categoriesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }

  const bannerImageUrl = await saveUploadedImage("categories-banner", file);
  const category = await categoriesRepository.updateBannerImage(id, bannerImageUrl);
  void deleteUploadedImage(existing.bannerImageUrl);
  return toResponse(category);
}

// The header mega menu's promo tile image (see Category.menuImageUrl).
export async function setCategoryMenuImage(id: number, file: Express.Multer.File) {
  const existing = await categoriesRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კატეგორია ვერ მოიძებნა");
  }

  const menuImageUrl = await saveUploadedImage("categories-menu", file);
  const category = await categoriesRepository.updateMenuImage(id, menuImageUrl);
  void deleteUploadedImage(existing.menuImageUrl);
  return toResponse(category);
}

import { ApiError } from "../../lib/ApiError.js";
import { productsRepository } from "../products/products.repository.js";
import { productFitmentRepository } from "../product-fitment/product-fitment.repository.js";
import { productFitmentRulesRepository } from "../product-fitment-rules/product-fitment-rules.repository.js";
import { vehicleCatalogRepository } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { resolveCategoryAndDescendantIds } from "../categories/categories.service.js";
import { getSpecFieldDefinition } from "../vehicle-category-filters/vehicle-spec-fields.registry.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { compatibilityRepository } from "./compatibility.repository.js";
import type { ListCompatibilityQuery } from "./compatibility.schema.js";
import type { Prisma } from "../../generated/prisma/index.js";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type BrandModelRefRow = { id: number; name: string; slug: string };
type ProductRefRow = NamedRefRow & { category: NamedRefRow };
type VehicleRefRow = {
  id: number;
  brand: BrandModelRefRow;
  model: BrandModelRefRow;
  variant: string;
  yearFrom: number | null;
  yearTo: number | null;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function toProductRef(row: ProductRefRow) {
  return {
    id: row.id,
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    slug: row.slug,
    category: toNamedRef(row.category),
  };
}

function ruleKind(type: "CATEGORY" | "SPEC" | "ALL"): "RULE_ALL" | "RULE_CATEGORY" | "RULE_SPEC" {
  if (type === "ALL") return "RULE_ALL";
  if (type === "CATEGORY") return "RULE_CATEGORY";
  return "RULE_SPEC";
}

function toVehicleRef(row: VehicleRefRow) {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    variant: row.variant,
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
  };
}

function buildProductWhere(filters: { search?: string; categoryId?: number }): Prisma.ProductWhereInput | undefined {
  const and: Prisma.ProductWhereInput[] = [];
  if (filters.search) {
    and.push({
      OR: [
        { nameKa: { contains: filters.search, mode: "insensitive" } },
        { nameEn: { contains: filters.search, mode: "insensitive" } },
        { nameRu: { contains: filters.search, mode: "insensitive" } },
      ],
    });
  }
  if (filters.categoryId != null) {
    and.push({ categoryId: filters.categoryId });
  }
  return and.length > 0 ? { AND: and } : undefined;
}

type FitmentRow = Awaited<ReturnType<typeof compatibilityRepository.findAllFitments>>[number];
type RuleRow = Awaited<ReturnType<typeof compatibilityRepository.findAllRules>>[number];
type RawEntry =
  | { source: "fitment"; createdAt: Date; row: FitmentRow }
  | { source: "rule"; createdAt: Date; row: RuleRow };

const DEFAULT_PAGE_SIZE = 20;

// Merges ProductFitment (explicit product<->vehicle pairs) and
// ProductFitmentRule (CATEGORY/SPEC/ALL declarative rules) into one flat,
// filterable, sorted, PAGINATED list.
//
// Pagination note: the two source tables are queried in parallel in full
// (and one is skipped entirely when `kind` narrows to the other) — there's
// no single query/UNION that cheaply spans both underlying Prisma models
// (different columns, different includes, and the rule side needs an extra
// per-row lookup fetch for its spec value). Both source sets are expected to
// stay small relative to e.g. orders/users, so fetching each in full from
// the DB is acceptable; what this fixes is the unbounded HTTP response. The
// raw rows are merged and sorted BEFORE the expensive async per-rule spec
// lookup, and only the current page's slice is then mapped to its response
// shape — so lookup queries are only issued for rows actually being
// returned, not the whole filtered set.
export async function listAllCompatibility(filters: ListCompatibilityQuery) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const productWhere = buildProductWhere(filters);
  const fitmentWhere = productWhere ? { product: productWhere } : undefined;
  const ruleWhere = productWhere ? { product: productWhere } : undefined;

  const [fitmentRows, ruleRows] = await Promise.all([
    filters.kind === "RULE" ? [] : compatibilityRepository.findAllFitments(fitmentWhere),
    filters.kind === "FITMENT" ? [] : compatibilityRepository.findAllRules(ruleWhere),
  ]);

  const raw: RawEntry[] = [
    ...fitmentRows.map((row): RawEntry => ({ source: "fitment", createdAt: row.createdAt, row })),
    ...ruleRows.map((row): RawEntry => ({ source: "rule", createdAt: row.createdAt, row })),
  ];
  raw.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const total = raw.length;
  const pageRaw = raw.slice((page - 1) * pageSize, page * pageSize);

  const items = await Promise.all(
    pageRaw.map(async (entry) => {
      if (entry.source === "fitment") {
        const row = entry.row;
        return {
          id: `fitment-${row.id}`,
          kind: "FITMENT" as const,
          product: toProductRef(row.product),
          vehicle: toVehicleRef(row.vehicleCatalog),
          category: null,
          specFieldLabel: null,
          specValue: null,
          createdAt: row.createdAt,
        };
      }

      const row = entry.row;
      let specFieldLabel = null;
      let specValue = null;
      if (row.specField && row.specLookupItemId != null) {
        const definition = getSpecFieldDefinition(row.specField);
        specFieldLabel = { ka: definition.nameKa, en: definition.nameEn, ru: definition.nameRu };
        if (definition.lookupType) {
          specValue = await lookupsRepository.findById(
            getLookupDelegate(definition.lookupType),
            row.specLookupItemId,
          );
        }
      }

      return {
        id: `rule-${row.id}`,
        kind: ruleKind(row.type),
        product: toProductRef(row.product),
        vehicle: null,
        category: row.category ? toNamedRef(row.category) : null,
        specFieldLabel,
        specValue,
        createdAt: row.createdAt,
      };
    }),
  );

  return { items, total, page, pageSize };
}

async function assertProductExists(productId: number) {
  const product = await productsRepository.findById(productId);
  if (!product) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }
}

// The reverse of products.service.ts's buildVehicleCompatibilityWhere — that
// one starts from a vehicle and tests a product's fitments/rules against it;
// this starts from a product's own fitments/rules and resolves the actual
// set of matching VehicleCatalog rows.
export async function getCompatibleVehiclesForProduct(productId: number) {
  await assertProductExists(productId);

  const [fitments, rules] = await Promise.all([
    productFitmentRepository.findMany(productId),
    productFitmentRulesRepository.findMany(productId),
  ]);

  if (rules.some((rule) => rule.type === "ALL")) {
    const allVehicles = await vehicleCatalogRepository.findMany();
    return allVehicles.map(toVehicleRef);
  }

  const or: Prisma.VehicleCatalogWhereInput[] = [];

  const explicitVehicleIds = fitments.map((fitment) => fitment.vehicleCatalog.id);
  if (explicitVehicleIds.length > 0) {
    or.push({ id: { in: explicitVehicleIds } });
  }

  for (const rule of rules) {
    if (rule.type === "CATEGORY" && rule.categoryId != null) {
      const descendantCategoryIds = await resolveCategoryAndDescendantIds(rule.categoryId);
      or.push({ model: { categoryId: { in: descendantCategoryIds } } });
    } else if (rule.type === "SPEC" && rule.specField && rule.specLookupItemId != null) {
      const { column } = getSpecFieldDefinition(rule.specField);
      or.push({ [column]: rule.specLookupItemId } as Prisma.VehicleCatalogWhereInput);
    }
  }

  if (or.length === 0) return [];

  const vehicles = await vehicleCatalogRepository.findMany({ OR: or });
  return vehicles.map(toVehicleRef);
}

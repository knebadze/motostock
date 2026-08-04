import { ApiError } from "../../lib/ApiError.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { productsRepository } from "../products/products.repository.js";
import { resolveCategoryAndAncestorIds } from "../attributes/attributes.service.js";
import { getLookupDelegate } from "../lookups/lookups.registry.js";
import { lookupsRepository } from "../lookups/lookups.repository.js";
import { getSpecFieldDefinition } from "../vehicle-category-filters/vehicle-spec-fields.registry.js";
import { productFitmentRulesRepository } from "./product-fitment-rules.repository.js";
import type {
  CreateProductFitmentRuleInput,
  VehicleSpecFieldInput,
} from "./product-fitment-rules.schema.js";
import type { VehicleSpecField } from "../../generated/prisma/index.js";

// Every vehicle (transport) category lives under this one root — same
// convention the frontend's isVehicleCategory() already relies on, so a
// CATEGORY rule can only ever point at an actual vehicle category, never a
// product category.
const VEHICLE_ROOT_CATEGORY_SLUG = "transport";

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string };

type ProductFitmentRuleRow = {
  id: number;
  productId: number;
  type: "CATEGORY" | "SPEC" | "ALL";
  categoryId: number | null;
  category: NamedRefRow | null;
  specField: VehicleSpecField | null;
  specLookupItemId: number | null;
  createdAt: Date;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

async function toResponse(row: ProductFitmentRuleRow) {
  let specFieldLabel = null;
  let specValue: LookupRow | null = null;

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
    id: row.id,
    productId: row.productId,
    type: row.type,
    category: row.category ? toNamedRef(row.category) : null,
    specField: row.specField,
    specFieldLabel,
    specValue,
    createdAt: row.createdAt,
  };
}

async function assertProductExists(productId: number) {
  const product = await productsRepository.findById(productId);
  if (!product) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }
}

async function assertIsVehicleCategory(categoryId: number) {
  const category = await categoriesRepository.findById(categoryId);
  if (!category) {
    throw new ApiError(400, "მითითებული კატეგორია არ არსებობს");
  }

  const ancestorIds = await resolveCategoryAndAncestorIds(categoryId);
  const rootId = ancestorIds[ancestorIds.length - 1];
  const root = await categoriesRepository.findById(rootId);
  if (root?.slug !== VEHICLE_ROOT_CATEGORY_SLUG) {
    throw new ApiError(400, "მითითებული კატეგორია ტრანსპორტის კატეგორია არ არის");
  }
}

async function assertSpecValueExists(specField: VehicleSpecFieldInput, specLookupItemId: number) {
  const definition = getSpecFieldDefinition(specField);
  if (definition.kind !== "LOOKUP" || !definition.lookupType) {
    throw new ApiError(400, "მითითებული მახასიათებელი ამ ტიპის წესისთვის არ გამოდგება");
  }

  const item = await lookupsRepository.findById(getLookupDelegate(definition.lookupType), specLookupItemId);
  if (!item) {
    throw new ApiError(400, "მითითებული მნიშვნელობა არ არსებობს");
  }
}

export async function listProductFitmentRules(productId: number) {
  await assertProductExists(productId);
  const rows = await productFitmentRulesRepository.findMany(productId);
  return Promise.all(rows.map(toResponse));
}

export async function createProductFitmentRule(
  productId: number,
  input: CreateProductFitmentRuleInput,
) {
  await assertProductExists(productId);

  if (input.type === "CATEGORY") {
    await assertIsVehicleCategory(input.categoryId!);
    const existing = await productFitmentRulesRepository.findByProductAndCategory(
      productId,
      input.categoryId!,
    );
    if (existing) {
      throw new ApiError(409, "ეს კატეგორია უკვე დამატებულია თავსებადობის წესებში");
    }
  } else if (input.type === "SPEC") {
    await assertSpecValueExists(input.specField!, input.specLookupItemId!);
    const existing = await productFitmentRulesRepository.findByProductAndSpec(
      productId,
      input.specField!,
      input.specLookupItemId!,
    );
    if (existing) {
      throw new ApiError(409, "ეს მახასიათებელი უკვე დამატებულია თავსებადობის წესებში");
    }
  } else {
    const existing = await productFitmentRulesRepository.findByProductAndAllType(productId);
    if (existing) {
      throw new ApiError(409, "\"ყველა ტრანსპორტთან თავსებადობა\" უკვე დამატებულია");
    }
  }

  const row = await productFitmentRulesRepository.create({
    productId,
    type: input.type,
    categoryId: input.type === "CATEGORY" ? input.categoryId : null,
    specField: input.type === "SPEC" ? input.specField : null,
    specLookupItemId: input.type === "SPEC" ? input.specLookupItemId : null,
  });
  return toResponse(row);
}

export async function deleteProductFitmentRule(productId: number, id: number) {
  const existing = await productFitmentRulesRepository.findById(id);
  if (!existing || existing.productId !== productId) {
    throw new ApiError(404, "წესი ვერ მოიძებნა");
  }

  await productFitmentRulesRepository.delete(id);
}

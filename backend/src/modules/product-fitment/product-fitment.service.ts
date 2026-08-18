import { ApiError } from "../../lib/ApiError.js";
import { productsRepository } from "../products/products.repository.js";
import { vehicleCatalogRepository } from "../vehicle-catalog/vehicle-catalog.repository.js";
import { productFitmentRepository } from "./product-fitment.repository.js";
import type { CreateProductFitmentInput } from "./product-fitment.schema.js";

type BrandModelRefRow = { id: number; name: string; slug: string };

type ProductFitmentRow = {
  id: number;
  productId: number;
  vehicleCatalog: {
    id: number;
    variant: string;
    yearFrom: number | null;
    yearTo: number | null;
    brand: BrandModelRefRow;
    model: BrandModelRefRow;
  };
  createdAt: Date;
};

function toResponse(row: ProductFitmentRow) {
  return {
    id: row.id,
    productId: row.productId,
    vehicleCatalog: {
      id: row.vehicleCatalog.id,
      brand: row.vehicleCatalog.brand,
      model: row.vehicleCatalog.model,
      variant: row.vehicleCatalog.variant,
      yearFrom: row.vehicleCatalog.yearFrom,
      yearTo: row.vehicleCatalog.yearTo,
    },
    createdAt: row.createdAt,
  };
}

async function assertProductExists(productId: number) {
  const product = await productsRepository.findById(productId);
  if (!product) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }
}

export async function listProductFitments(productId: number) {
  await assertProductExists(productId);
  const rows = await productFitmentRepository.findMany(productId);
  return rows.map(toResponse);
}

export async function createProductFitment(
  productId: number,
  input: CreateProductFitmentInput,
) {
  await assertProductExists(productId);

  const catalogEntry = await vehicleCatalogRepository.findById(input.vehicleCatalogId);
  if (!catalogEntry) {
    throw new ApiError(400, "მითითებული ტექნიკის კატალოგის ჩანაწერი არ არსებობს");
  }

  const existing = await productFitmentRepository.findByProductAndCatalog(
    productId,
    input.vehicleCatalogId,
  );
  if (existing) {
    throw new ApiError(409, "ეს თავსებადობა უკვე დამატებულია");
  }

  const row = await productFitmentRepository.create({
    productId,
    vehicleCatalogId: input.vehicleCatalogId,
  });
  return toResponse(row);
}

export async function deleteProductFitment(productId: number, id: number) {
  const existing = await productFitmentRepository.findById(id);
  if (!existing || existing.productId !== productId) {
    throw new ApiError(404, "თავსებადობა ვერ მოიძებნა");
  }

  await productFitmentRepository.delete(id);
}

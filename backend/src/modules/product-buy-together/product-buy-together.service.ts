import { ApiError } from "../../lib/ApiError.js";
import { productsRepository } from "../products/products.repository.js";
import { toResponse as toProductResponse } from "../products/products.service.js";
import { productBuyTogetherRepository } from "./product-buy-together.repository.js";
import type { CreateProductBuyTogetherInput } from "./product-buy-together.schema.js";

type ProductBuyTogetherRow = {
  id: number;
  productId: number;
  relatedProduct: Parameters<typeof toProductResponse>[0];
  createdAt: Date;
};

function toResponse(row: ProductBuyTogetherRow) {
  return {
    id: row.id,
    productId: row.productId,
    relatedProduct: toProductResponse(row.relatedProduct),
    createdAt: row.createdAt,
  };
}

async function assertProductExists(productId: number) {
  const product = await productsRepository.findById(productId);
  if (!product) {
    throw new ApiError(404, "პროდუქტი ვერ მოიძებნა");
  }
}

export async function listProductBuyTogether(productId: number) {
  await assertProductExists(productId);
  const rows = await productBuyTogetherRepository.findMany(productId);
  return rows.map(toResponse);
}

export async function createProductBuyTogether(
  productId: number,
  input: CreateProductBuyTogetherInput,
) {
  await assertProductExists(productId);

  if (input.relatedProductId === productId) {
    throw new ApiError(400, "პროდუქტი ვერ დაემატება საკუთარ თავთან ერთად შესაძენად");
  }

  const relatedProduct = await productsRepository.findById(input.relatedProductId);
  if (!relatedProduct) {
    throw new ApiError(400, "მითითებული პროდუქტი არ არსებობს");
  }

  const existing = await productBuyTogetherRepository.findByProductAndRelated(
    productId,
    input.relatedProductId,
  );
  if (existing) {
    throw new ApiError(409, "ეს პროდუქტი უკვე დამატებულია");
  }

  const row = await productBuyTogetherRepository.create({
    productId,
    relatedProductId: input.relatedProductId,
  });
  return toResponse(row);
}

export async function deleteProductBuyTogether(productId: number, id: number) {
  const existing = await productBuyTogetherRepository.findById(id);
  if (!existing || existing.productId !== productId) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა");
  }

  await productBuyTogetherRepository.delete(id);
}

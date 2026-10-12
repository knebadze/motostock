import { prisma } from "../../config/prisma.js";
import { listProducts } from "../products/products.service.js";
import { productListQuerySchema } from "../products/products.schema.js";
import { listVehicleListings } from "../vehicle-listing/vehicle-listing.service.js";
import { vehicleListingListQuerySchema } from "../vehicle-listing/vehicle-listing.schema.js";

const SUGGEST_PRODUCT_LIMIT = 5;
const SUGGEST_VEHICLE_LIMIT = 4;
const SUGGEST_CATEGORY_LIMIT = 5;

// The header's global search dropdown (HeaderSearch.tsx): a few top matches
// of each kind, as lean rows. Products and vehicle listings go through the
// same ranked, typo-tolerant search as the shop pages (pg_trgm
// word_similarity — see findSearchRankedIds), so the dropdown and the
// /search results page agree; categories are a plain name match.
export async function getSearchSuggestions(q: string) {
  const [productsResult, listingsResult, categoryRows] = await Promise.all([
    listProducts(productListQuerySchema.parse({ search: q, limit: SUGGEST_PRODUCT_LIMIT })),
    listVehicleListings(vehicleListingListQuerySchema.parse({ search: q, limit: SUGGEST_VEHICLE_LIMIT })),
    prisma.category.findMany({
      where: {
        OR: [
          { nameKa: { contains: q, mode: "insensitive" } },
          { nameEn: { contains: q, mode: "insensitive" } },
          { nameRu: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        nameKa: true,
        nameEn: true,
        nameRu: true,
        slug: true,
        parent: { select: { nameKa: true, nameEn: true, nameRu: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { nameKa: "asc" }],
      take: SUGGEST_CATEGORY_LIMIT,
    }),
  ]);

  return {
    products: productsResult.items.slice(0, SUGGEST_PRODUCT_LIMIT).map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      categorySlug: product.category.slug,
      categoryName: product.category.name,
      imageUrl: product.imageUrl,
      price: product.minPrice,
      discountPrice: product.activeDiscount?.discountPrice ?? null,
    })),
    vehicleListings: listingsResult.items.slice(0, SUGGEST_VEHICLE_LIMIT).map((listing) => ({
      id: listing.id,
      title: `${listing.vehicleCatalog.brand.name} ${listing.vehicleCatalog.model.name}`,
      year: listing.year,
      categorySlug: listing.vehicleCatalog.category.slug,
      categoryName: listing.vehicleCatalog.category.name,
      itemSlug: `${listing.vehicleCatalog.brand.slug}-${listing.vehicleCatalog.model.slug}-${listing.year}-${listing.id}`,
      imageUrl: listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl,
      price: listing.price,
      discountPrice: listing.activeDiscount?.discountPrice ?? null,
      priceCurrency: listing.priceCurrency,
    })),
    categories: categoryRows.map((category) => ({
      id: category.id,
      name: { ka: category.nameKa, en: category.nameEn, ru: category.nameRu },
      slug: category.slug,
      parentName: category.parent
        ? { ka: category.parent.nameKa, en: category.parent.nameEn, ru: category.parent.nameRu }
        : null,
    })),
  };
}

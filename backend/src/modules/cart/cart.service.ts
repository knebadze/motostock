import { ApiError } from "../../lib/ApiError.js";
import { findActiveDiscount } from "../../lib/discounts.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import { productVariantsRepository } from "../product-variants/product-variants.repository.js";
import { vehicleListingRepository } from "../vehicle-listing/vehicle-listing.repository.js";
import { toVehicleListingResponse } from "../vehicle-listing/vehicle-listing.service.js";
import {
  toDiscountResponse,
  type DiscountRow,
} from "../product-variant-discounts/product-variant-discounts.service.js";
import { toImageResponse } from "../product-variant-images/product-variant-images.service.js";
import { cartRepository, type CartOwner } from "./cart.repository.js";
import type { CreateCartItemInput } from "./cart.schema.js";
import type { CartItemType } from "../../generated/prisma/index.js";

const MAX_QUANTITY = 99;

type NamedRefRow = { id: number; nameKa: string; nameEn: string; nameRu: string; slug: string };
type LookupRow = { id: number; key: string; nameKa: string; nameEn: string; nameRu: string } | null;
type ImageRow = { id: number; imageUrl: string; position: number };

type ProductVariantRow = {
  id: number;
  product: {
    id: number;
    nameKa: string;
    nameEn: string;
    nameRu: string;
    slug: string;
    imageUrl: string | null;
    category: NamedRefRow;
  };
  size: LookupRow;
  color: LookupRow;
  price: { toString(): string };
  stockQuantity: number;
  isActive: boolean;
  images: ImageRow[];
  discounts: DiscountRow[];
};

type CartItemRow = {
  id: number;
  userId: number | null;
  guestId: string | null;
  itemType: CartItemType;
  quantity: number;
  productVariant: ProductVariantRow | null;
  vehicleListing: Parameters<typeof toVehicleListingResponse>[0] | null;
  createdAt: Date;
};

function toNamedRef(row: NamedRefRow) {
  return { id: row.id, name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu }, slug: row.slug };
}

function toProductVariantCartResponse(row: ProductVariantRow) {
  const activeDiscount = findActiveDiscount(row.discounts);

  return {
    id: row.id,
    product: {
      id: row.product.id,
      name: { ka: row.product.nameKa, en: row.product.nameEn, ru: row.product.nameRu },
      slug: row.product.slug,
      imageUrl: row.product.imageUrl,
      category: toNamedRef(row.product.category),
    },
    size: row.size,
    color: row.color,
    price: Number(row.price),
    stockQuantity: row.stockQuantity,
    isActive: row.isActive,
    images: row.images.map(toImageResponse),
    activeDiscount: activeDiscount ? toDiscountResponse(activeDiscount) : null,
  };
}

function ownerMatches(row: { userId: number | null; guestId: string | null }, owner: CartOwner) {
  return "userId" in owner ? row.userId === owner.userId : row.guestId === owner.guestId;
}

// Exported for users.service.ts's admin "full detail" view to reuse
// (imported there as `toResponse as toCartItemResponse`).
export function toResponse(row: CartItemRow) {
  const productVariant = row.productVariant ? toProductVariantCartResponse(row.productVariant) : null;
  const vehicleListing = row.vehicleListing ? toVehicleListingResponse(row.vehicleListing) : null;
  const unitPrice =
    productVariant?.activeDiscount?.discountPrice ??
    productVariant?.price ??
    vehicleListing?.activeDiscount?.discountPrice ??
    vehicleListing?.price ??
    0;

  return {
    id: row.id,
    itemType: row.itemType,
    quantity: row.quantity,
    unitPrice,
    lineTotal: Math.round(unitPrice * row.quantity * 100) / 100,
    productVariant,
    vehicleListing,
    createdAt: row.createdAt,
  };
}

export async function listMyCart(owner: CartOwner) {
  const rows = await cartRepository.findByOwner(owner);
  const items = rows.map(toResponse);
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, subtotal, itemCount };
}

export async function getMyCartCount(owner: CartOwner) {
  const result = await cartRepository.countByOwner(owner);
  return { count: result._sum.quantity ?? 0 };
}

export async function getCartStatus(
  owner: CartOwner,
  productVariantIds: number[],
  vehicleListingIds: number[],
) {
  const rows = await cartRepository.findStatus(owner, productVariantIds, vehicleListingIds);
  return {
    items: rows.map((row) => ({
      id: row.id,
      productVariantId: row.productVariantId,
      vehicleListingId: row.vehicleListingId,
      quantity: row.quantity,
    })),
  };
}

async function addToExistingCartItem(
  existing: { id: number; quantity: number },
  quantity: number,
  stockQuantity: number,
) {
  const nextQuantity = Math.min(existing.quantity + quantity, stockQuantity, MAX_QUANTITY);
  const row = await cartRepository.updateQuantity(existing.id, nextQuantity);
  return toResponse(row);
}

async function addProductVariantToCart(owner: CartOwner, productVariantId: number, quantity: number) {
  const variant = await productVariantsRepository.findById(productVariantId);
  if (!variant) {
    throw new ApiError(400, "მითითებული ვარიანტი არ არსებობს", "PRODUCT_VARIANT_NOT_FOUND");
  }
  // Same customer-facing message/code as an out-of-stock variant — an admin
  // deactivating a variant to pull it from sale should behave identically
  // to it running out, not surface a different (or no) error.
  if (!variant.isActive || variant.stockQuantity <= 0) {
    throw new ApiError(400, "პროდუქტი არ არის მარაგში", "OUT_OF_STOCK");
  }

  const existing = await cartRepository.findByOwnerAndProductVariant(owner, productVariantId);
  if (existing) {
    return addToExistingCartItem(existing, quantity, variant.stockQuantity);
  }

  const cappedQuantity = Math.min(quantity, variant.stockQuantity, MAX_QUANTITY);
  try {
    const row = await cartRepository.create({
      ...owner,
      itemType: "PRODUCT_VARIANT",
      productVariantId,
      quantity: cappedQuantity,
    });
    return toResponse(row);
  } catch (err) {
    // Two simultaneous "add to cart" clicks for the same not-yet-in-cart
    // item can both pass the findByOwnerAndProductVariant check above
    // before either commits — this catches the DB-level unique-constraint
    // collision that results (same safety-net role orders.service.ts's
    // isOrderCodeCollision plays) and folds into the row the other request
    // just created, instead of surfacing a raw 500 to whichever request
    // loses the race.
    if (!isUniqueConstraintViolation(err, "productVariantId")) throw err;
    const winner = await cartRepository.findByOwnerAndProductVariant(owner, productVariantId);
    if (!winner) throw err;
    return addToExistingCartItem(winner, quantity, variant.stockQuantity);
  }
}

async function addVehicleListingToCart(owner: CartOwner, vehicleListingId: number, quantity: number) {
  const listing = await vehicleListingRepository.findById(vehicleListingId);
  if (!listing) {
    throw new ApiError(400, "მითითებული განცხადება არ არსებობს", "VEHICLE_LISTING_NOT_FOUND");
  }
  // Same customer-facing message/code as a sold-out listing — an admin
  // deactivating a listing to pull it from sale should behave identically
  // to it running out, not surface a different (or no) error.
  if (!listing.isActive || listing.stockQuantity <= 0) {
    throw new ApiError(400, "ეს ერთეული ხელმისაწვდომი აღარ არის", "VEHICLE_LISTING_UNAVAILABLE");
  }

  const existing = await cartRepository.findByOwnerAndVehicleListing(owner, vehicleListingId);
  if (existing) {
    return addToExistingCartItem(existing, quantity, listing.stockQuantity);
  }

  const cappedQuantity = Math.min(quantity, listing.stockQuantity, MAX_QUANTITY);
  try {
    const row = await cartRepository.create({
      ...owner,
      itemType: "VEHICLE_LISTING",
      vehicleListingId,
      quantity: cappedQuantity,
    });
    return toResponse(row);
  } catch (err) {
    // Same double-click safety net as addProductVariantToCart above.
    if (!isUniqueConstraintViolation(err, "vehicleListingId")) throw err;
    const winner = await cartRepository.findByOwnerAndVehicleListing(owner, vehicleListingId);
    if (!winner) throw err;
    return addToExistingCartItem(winner, quantity, listing.stockQuantity);
  }
}

export async function addCartItem(owner: CartOwner, input: CreateCartItemInput) {
  const quantity = input.quantity ?? 1;

  if (input.itemType === "PRODUCT_VARIANT") {
    if (!input.productVariantId) {
      throw new ApiError(400, "მითითებული უნდა იყოს productVariantId", "MISSING_REQUIRED_FIELD");
    }
    return addProductVariantToCart(owner, input.productVariantId, quantity);
  }

  if (!input.vehicleListingId) {
    throw new ApiError(400, "მითითებული უნდა იყოს vehicleListingId", "MISSING_REQUIRED_FIELD");
  }
  return addVehicleListingToCart(owner, input.vehicleListingId, quantity);
}

export async function updateCartItemQuantity(owner: CartOwner, id: number, quantity: number) {
  const existing = await cartRepository.findById(id);
  if (!existing || !ownerMatches(existing, owner)) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა", "CART_ITEM_NOT_FOUND");
  }

  // Treated the same as zero stock when the item has since been deactivated —
  // this caps cappedQuantity to 0 below, same as a genuinely sold-out item,
  // rather than letting an inactive item's quantity be raised.
  const isActive = existing.productVariant?.isActive ?? existing.vehicleListing?.isActive ?? false;
  const stockQuantity = isActive
    ? (existing.productVariant?.stockQuantity ?? existing.vehicleListing?.stockQuantity ?? 0)
    : 0;
  const cappedQuantity = Math.min(quantity, stockQuantity, MAX_QUANTITY);
  if (cappedQuantity <= 0) {
    throw new ApiError(400, "მარაგში საკმარისი რაოდენობა აღარ არის", "INSUFFICIENT_STOCK");
  }

  const row = await cartRepository.updateQuantity(id, cappedQuantity);
  return toResponse(row);
}

export async function removeCartItem(owner: CartOwner, id: number) {
  const existing = await cartRepository.findById(id);
  if (!existing || !ownerMatches(existing, owner)) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა", "CART_ITEM_NOT_FOUND");
  }

  await cartRepository.delete(id);
}

// Called right after login (see guest-identity.middleware.ts
// mergeGuestDataIntoUser) — folds guest cart rows into the now-known
// account. Unlike wishlist, a conflicting item doesn't just get dropped:
// quantities add together (2 in the guest cart + 1 already in the
// account's own cart = 3), since a cart quantity is meaningful in a way a
// wishlist membership isn't. Each item is merged via its own atomic
// claim-then-upsert (see cart.repository.ts's mergeGuestItem) so two
// concurrent logins on the same guest cookie (double-tab, a retried
// request) can't double-credit a quantity or crash on a row the other one
// already claimed.
export async function mergeGuestCartIntoUser(guestId: string, userId: number) {
  const guestItems = await cartRepository.findByGuestId(guestId);

  for (const item of guestItems) {
    await cartRepository.mergeGuestItem(item, guestId, userId);
  }
}

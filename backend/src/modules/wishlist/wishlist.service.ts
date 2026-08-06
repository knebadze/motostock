import { ApiError } from "../../lib/ApiError.js";
import { productsRepository } from "../products/products.repository.js";
import { toResponse as toProductResponse } from "../products/products.service.js";
import { vehicleListingRepository } from "../vehicle-listing/vehicle-listing.repository.js";
import { toVehicleListingResponse } from "../vehicle-listing/vehicle-listing.service.js";
import { wishlistRepository, type WishlistOwner } from "./wishlist.repository.js";
import type { CreateWishlistItemInput } from "./wishlist.schema.js";
import type { WishlistItemType } from "../../generated/prisma/index.js";

type WishlistItemRow = {
  id: number;
  itemType: WishlistItemType;
  product: Parameters<typeof toProductResponse>[0] | null;
  vehicleListing: Parameters<typeof toVehicleListingResponse>[0] | null;
  createdAt: Date;
};

function toResponse(row: WishlistItemRow) {
  return {
    id: row.id,
    itemType: row.itemType,
    product: row.product ? toProductResponse(row.product) : null,
    vehicleListing: row.vehicleListing ? toVehicleListingResponse(row.vehicleListing) : null,
    createdAt: row.createdAt,
  };
}

function ownerMatches(row: { userId: number | null; guestId: string | null }, owner: WishlistOwner) {
  return "userId" in owner ? row.userId === owner.userId : row.guestId === owner.guestId;
}

export async function listMyWishlist(owner: WishlistOwner) {
  const rows = await wishlistRepository.findByOwner(owner);
  return rows.map(toResponse);
}

async function addProductToWishlist(owner: WishlistOwner, productId: number) {
  const product = await productsRepository.findById(productId);
  if (!product) {
    throw new ApiError(400, "მითითებული პროდუქტი არ არსებობს");
  }

  const existing = await wishlistRepository.findByOwnerAndProduct(owner, productId);
  if (existing) {
    return toResponse((await wishlistRepository.findById(existing.id))!);
  }

  const row = await wishlistRepository.create({ ...owner, itemType: "PRODUCT", productId });
  return toResponse(row);
}

async function addVehicleListingToWishlist(owner: WishlistOwner, vehicleListingId: number) {
  const listing = await vehicleListingRepository.findById(vehicleListingId);
  if (!listing) {
    throw new ApiError(400, "მითითებული განცხადება არ არსებობს");
  }

  const existing = await wishlistRepository.findByOwnerAndVehicleListing(owner, vehicleListingId);
  if (existing) {
    return toResponse((await wishlistRepository.findById(existing.id))!);
  }

  const row = await wishlistRepository.create({
    ...owner,
    itemType: "VEHICLE_LISTING",
    vehicleListingId,
  });
  return toResponse(row);
}

export async function addWishlistItem(owner: WishlistOwner, input: CreateWishlistItemInput) {
  if (input.itemType === "PRODUCT") {
    if (!input.productId) {
      throw new ApiError(400, "მითითებული უნდა იყოს productId");
    }
    return addProductToWishlist(owner, input.productId);
  }

  if (!input.vehicleListingId) {
    throw new ApiError(400, "მითითებული უნდა იყოს vehicleListingId");
  }
  return addVehicleListingToWishlist(owner, input.vehicleListingId);
}

export async function removeWishlistItem(owner: WishlistOwner, id: number) {
  const existing = await wishlistRepository.findById(id);
  if (!existing || !ownerMatches(existing, owner)) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა");
  }

  await wishlistRepository.delete(id);
}

export async function getWishlistStatus(
  owner: WishlistOwner,
  productIds: number[],
  vehicleListingIds: number[],
) {
  const rows = await wishlistRepository.findStatus(owner, productIds, vehicleListingIds);
  return {
    items: rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      vehicleListingId: row.vehicleListingId,
    })),
  };
}

// Called right after login (see the 5 setAuthCookie call sites) when a
// guest wishlist cookie is present — folds those rows into the now-known
// account. A guest item that duplicates something the user already has
// (same product/vehicle listing) is just dropped instead of reassigned,
// since reassigning would collide with the user's own unique constraint.
export async function mergeGuestWishlistIntoUser(guestId: string, userId: number) {
  const guestItems = await wishlistRepository.findByGuestId(guestId);

  for (const item of guestItems) {
    const existing =
      item.productId != null
        ? await wishlistRepository.findByOwnerAndProduct({ userId }, item.productId)
        : item.vehicleListingId != null
          ? await wishlistRepository.findByOwnerAndVehicleListing({ userId }, item.vehicleListingId)
          : null;

    if (existing) {
      await wishlistRepository.delete(item.id);
    } else {
      await wishlistRepository.reassignToUser(item.id, userId);
    }
  }
}

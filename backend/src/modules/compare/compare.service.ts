import { ApiError } from "../../lib/ApiError.js";
import { productsRepository } from "../products/products.repository.js";
import { toResponse as toProductResponse } from "../products/products.service.js";
import { vehicleListingRepository } from "../vehicle-listing/vehicle-listing.repository.js";
import { toVehicleListingResponse } from "../vehicle-listing/vehicle-listing.service.js";
import { compareRepository, type CompareOwner } from "./compare.repository.js";
import type { CreateCompareItemInput } from "./compare.schema.js";
import type { CompareItemType } from "../../generated/prisma/index.js";

// A comparison table stops being readable well before this — same reasoning
// as any "compare" widget capping the column count.
const MAX_COMPARE_ITEMS = 4;

type CompareItemRow = {
  id: number;
  itemType: CompareItemType;
  product: Parameters<typeof toProductResponse>[0] | null;
  vehicleListing: Parameters<typeof toVehicleListingResponse>[0] | null;
  createdAt: Date;
};

export function toResponse(row: CompareItemRow) {
  return {
    id: row.id,
    itemType: row.itemType,
    product: row.product ? toProductResponse(row.product) : null,
    vehicleListing: row.vehicleListing ? toVehicleListingResponse(row.vehicleListing) : null,
    createdAt: row.createdAt,
  };
}

function ownerMatches(row: { userId: number | null; guestId: string | null }, owner: CompareOwner) {
  return "userId" in owner ? row.userId === owner.userId : row.guestId === owner.guestId;
}

export async function listMyCompare(owner: CompareOwner) {
  const rows = await compareRepository.findByOwner(owner);
  return rows.map(toResponse);
}

async function addProductToCompare(owner: CompareOwner, productId: number) {
  const product = await productsRepository.findById(productId);
  if (!product) {
    throw new ApiError(400, "მითითებული პროდუქტი არ არსებობს");
  }

  const existing = await compareRepository.findByOwnerAndProduct(owner, productId);
  if (existing) {
    return toResponse((await compareRepository.findById(existing.id))!);
  }

  await assertUnderLimit(owner);
  const row = await compareRepository.create({ ...owner, itemType: "PRODUCT", productId });
  return toResponse(row);
}

async function addVehicleListingToCompare(owner: CompareOwner, vehicleListingId: number) {
  const listing = await vehicleListingRepository.findById(vehicleListingId);
  if (!listing) {
    throw new ApiError(400, "მითითებული განცხადება არ არსებობს");
  }

  const existing = await compareRepository.findByOwnerAndVehicleListing(owner, vehicleListingId);
  if (existing) {
    return toResponse((await compareRepository.findById(existing.id))!);
  }

  await assertUnderLimit(owner);
  const row = await compareRepository.create({
    ...owner,
    itemType: "VEHICLE_LISTING",
    vehicleListingId,
  });
  return toResponse(row);
}

async function assertUnderLimit(owner: CompareOwner) {
  const count = await compareRepository.countByOwner(owner);
  if (count >= MAX_COMPARE_ITEMS) {
    throw new ApiError(400, `შედარებაში ერთდროულად მაქსიმუმ ${MAX_COMPARE_ITEMS} ერთეულის დამატებაა შესაძლებელი`);
  }
}

export async function addCompareItem(owner: CompareOwner, input: CreateCompareItemInput) {
  if (input.itemType === "PRODUCT") {
    if (!input.productId) {
      throw new ApiError(400, "მითითებული უნდა იყოს productId");
    }
    return addProductToCompare(owner, input.productId);
  }

  if (!input.vehicleListingId) {
    throw new ApiError(400, "მითითებული უნდა იყოს vehicleListingId");
  }
  return addVehicleListingToCompare(owner, input.vehicleListingId);
}

export async function removeCompareItem(owner: CompareOwner, id: number) {
  const existing = await compareRepository.findById(id);
  if (!existing || !ownerMatches(existing, owner)) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა");
  }

  await compareRepository.delete(id);
}

// For the header badge — a plain count, not the full item list.
export async function getCompareCount(owner: CompareOwner) {
  return { count: await compareRepository.countByOwner(owner) };
}

export async function getCompareStatus(
  owner: CompareOwner,
  productIds: number[],
  vehicleListingIds: number[],
) {
  const rows = await compareRepository.findStatus(owner, productIds, vehicleListingIds);
  return {
    items: rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      vehicleListingId: row.vehicleListingId,
    })),
  };
}

// Called right after login (see guest-identity.middleware.ts's
// mergeGuestDataIntoUser) when a guest compare cookie is present — folds
// those rows into the now-known account. A guest item that duplicates
// something the user already has is just dropped instead of reassigned,
// since reassigning would collide with the user's own unique constraint —
// same tradeoff mergeGuestWishlistIntoUser makes.
export async function mergeGuestCompareIntoUser(guestId: string, userId: number) {
  const guestItems = await compareRepository.findByGuestId(guestId);

  for (const item of guestItems) {
    const existing =
      item.productId != null
        ? await compareRepository.findByOwnerAndProduct({ userId }, item.productId)
        : item.vehicleListingId != null
          ? await compareRepository.findByOwnerAndVehicleListing({ userId }, item.vehicleListingId)
          : null;

    if (existing) {
      await compareRepository.delete(item.id);
    } else {
      await compareRepository.reassignToUser(item.id, userId);
    }
  }
}

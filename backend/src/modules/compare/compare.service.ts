import { ApiError } from "../../lib/ApiError.js";
import { isUniqueConstraintViolation } from "../../lib/prismaErrors.js";
import { productsRepository } from "../products/products.repository.js";
import { toResponse as toProductResponse } from "../products/products.service.js";
import { vehicleListingRepository } from "../vehicle-listing/vehicle-listing.repository.js";
import { toVehicleListingResponse } from "../vehicle-listing/vehicle-listing.service.js";
import { getCompareMaxItems } from "../settings/settings.service.js";
import { compareRepository, type CompareOwner } from "./compare.repository.js";
import type { CreateCompareItemInput } from "./compare.schema.js";
import type { CompareItemType } from "../../generated/prisma/index.js";

type CompareItemRow = {
  id: number;
  itemType: CompareItemType;
  product: Parameters<typeof toProductResponse>[0] | null;
  vehicleListing: Parameters<typeof toVehicleListingResponse>[0] | null;
  createdAt: Date;
};

export async function toResponse(row: CompareItemRow) {
  return {
    id: row.id,
    itemType: row.itemType,
    product: row.product ? await toProductResponse(row.product) : null,
    vehicleListing: row.vehicleListing ? toVehicleListingResponse(row.vehicleListing) : null,
    createdAt: row.createdAt,
  };
}

function ownerMatches(row: { userId: number | null; guestId: string | null }, owner: CompareOwner) {
  return "userId" in owner ? row.userId === owner.userId : row.guestId === owner.guestId;
}

export async function listMyCompare(owner: CompareOwner) {
  const rows = await compareRepository.findByOwner(owner);
  return Promise.all(rows.map(toResponse));
}

async function addProductToCompare(owner: CompareOwner, productId: number) {
  const product = await productsRepository.findById(productId);
  if (!product) {
    throw new ApiError(400, "მითითებული პროდუქტი არ არსებობს", "PRODUCT_NOT_FOUND");
  }

  const existing = await compareRepository.findByOwnerAndProduct(owner, productId);
  if (existing) {
    return toResponse((await compareRepository.findById(existing.id))!);
  }

  const maxCompareItems = await getCompareMaxItems();
  try {
    const row = await compareRepository.createUnderLimit(owner, maxCompareItems, {
      itemType: "PRODUCT",
      productId,
    });
    return toResponse(row);
  } catch (err) {
    // Two simultaneous compare-button clicks for the same not-yet-listed
    // product can both pass the findByOwnerAndProduct check above before
    // either commits — this catches the resulting unique-constraint
    // collision and returns the row the other request just created,
    // instead of surfacing a raw 500 to whichever request loses the race.
    if (!isUniqueConstraintViolation(err, "productId")) throw err;
    const winner = await compareRepository.findByOwnerAndProduct(owner, productId);
    if (!winner) throw err;
    return toResponse((await compareRepository.findById(winner.id))!);
  }
}

async function addVehicleListingToCompare(owner: CompareOwner, vehicleListingId: number) {
  const listing = await vehicleListingRepository.findById(vehicleListingId);
  if (!listing) {
    throw new ApiError(400, "მითითებული განცხადება არ არსებობს", "VEHICLE_LISTING_NOT_FOUND");
  }

  const existing = await compareRepository.findByOwnerAndVehicleListing(owner, vehicleListingId);
  if (existing) {
    return toResponse((await compareRepository.findById(existing.id))!);
  }

  const maxCompareItems = await getCompareMaxItems();
  try {
    const row = await compareRepository.createUnderLimit(owner, maxCompareItems, {
      itemType: "VEHICLE_LISTING",
      vehicleListingId,
    });
    return toResponse(row);
  } catch (err) {
    // Same double-click safety net as addProductToCompare above.
    if (!isUniqueConstraintViolation(err, "vehicleListingId")) throw err;
    const winner = await compareRepository.findByOwnerAndVehicleListing(owner, vehicleListingId);
    if (!winner) throw err;
    return toResponse((await compareRepository.findById(winner.id))!);
  }
}

export async function addCompareItem(owner: CompareOwner, input: CreateCompareItemInput) {
  if (input.itemType === "PRODUCT") {
    if (!input.productId) {
      throw new ApiError(400, "მითითებული უნდა იყოს productId", "MISSING_REQUIRED_FIELD");
    }
    return addProductToCompare(owner, input.productId);
  }

  if (!input.vehicleListingId) {
    throw new ApiError(400, "მითითებული უნდა იყოს vehicleListingId", "MISSING_REQUIRED_FIELD");
  }
  return addVehicleListingToCompare(owner, input.vehicleListingId);
}

export async function removeCompareItem(owner: CompareOwner, id: number) {
  const existing = await compareRepository.findById(id);
  if (!existing || !ownerMatches(existing, owner)) {
    throw new ApiError(404, "ჩანაწერი ვერ მოიძებნა", "COMPARE_ITEM_NOT_FOUND");
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
// same tradeoff mergeGuestWishlistIntoUser makes. Each item is merged via
// its own atomic claim-then-insert (see compare.repository.ts's
// mergeGuestItem) so two concurrent logins on the same guest cookie can't
// crash on a row the other one already claimed.
export async function mergeGuestCompareIntoUser(guestId: string, userId: number) {
  const guestItems = await compareRepository.findByGuestId(guestId);

  for (const item of guestItems) {
    await compareRepository.mergeGuestItem(item, guestId, userId);
  }
}

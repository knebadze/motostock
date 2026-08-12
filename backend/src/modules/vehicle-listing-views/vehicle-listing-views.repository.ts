import { prisma } from "../../config/prisma.js";
import type { ProductViewOwner } from "../product-views/product-views.repository.js";

// Reuses ProductViewOwner ({userId} | {guestId}) — the shape is generic
// despite the product-specific name (see product-views.middleware.ts's
// resolveProductViewOwner, also reused as-is below), not worth a
// byte-identical duplicate type here.
export type VehicleListingViewOwner = ProductViewOwner;

function ownerWhere(owner: VehicleListingViewOwner) {
  return "userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId };
}

export const vehicleListingViewsRepository = {
  // Upsert, not insert — one row per (owner, listing), see
  // vehicle-listing-view.prisma.
  upsertView(owner: VehicleListingViewOwner, vehicleListingId: number) {
    if ("userId" in owner) {
      return prisma.vehicleListingView.upsert({
        where: { userId_vehicleListingId: { userId: owner.userId, vehicleListingId } },
        create: { userId: owner.userId, vehicleListingId },
        update: { viewCount: { increment: 1 } },
      });
    }
    return prisma.vehicleListingView.upsert({
      where: { guestId_vehicleListingId: { guestId: owner.guestId, vehicleListingId } },
      create: { guestId: owner.guestId, vehicleListingId },
      update: { viewCount: { increment: 1 } },
    });
  },

  findByOwnerAndVehicleListing(owner: VehicleListingViewOwner, vehicleListingId: number) {
    return prisma.vehicleListingView.findFirst({ where: { ...ownerWhere(owner), vehicleListingId } });
  },

  // Merge-on-login support (see vehicle-listing-views.service.ts
  // mergeGuestVehicleListingViewsIntoUser).
  findByGuestId(guestId: string) {
    return prisma.vehicleListingView.findMany({ where: { guestId } });
  },

  reassignToUser(id: number, userId: number) {
    return prisma.vehicleListingView.update({ where: { id }, data: { userId, guestId: null } });
  },

  incrementViewCount(id: number, by: number) {
    return prisma.vehicleListingView.update({ where: { id }, data: { viewCount: { increment: by } } });
  },

  delete(id: number) {
    return prisma.vehicleListingView.delete({ where: { id } });
  },
};

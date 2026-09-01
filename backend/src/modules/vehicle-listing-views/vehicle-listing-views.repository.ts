import { prisma } from "../../config/prisma.js";
import type { ProductViewOwner } from "../product-views/product-views.repository.js";

// Reuses ProductViewOwner ({userId} | {guestId}) — the shape is generic
// despite the product-specific name (see product-views.middleware.ts's
// resolveProductViewOwner, also reused as-is below), not worth a
// byte-identical duplicate type here.
export type VehicleListingViewOwner = ProductViewOwner;

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

  // Merge-on-login support (see vehicle-listing-views.service.ts
  // mergeGuestVehicleListingViewsIntoUser).
  findByGuestId(guestId: string) {
    return prisma.vehicleListingView.findMany({ where: { guestId } });
  },

  // Atomically folds one guest view row into `userId`'s views — same
  // claim-then-upsert reasoning as product-views.repository.ts's
  // mergeGuestItem (see there for the full explanation).
  async mergeGuestItem(
    view: { id: number; vehicleListingId: number; viewCount: number },
    guestId: string,
    userId: number,
  ) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.vehicleListingView.deleteMany({ where: { id: view.id, guestId } });
      if (claimed.count === 0) return;

      await tx.vehicleListingView.upsert({
        where: { userId_vehicleListingId: { userId, vehicleListingId: view.vehicleListingId } },
        create: { userId, vehicleListingId: view.vehicleListingId, viewCount: view.viewCount },
        update: { viewCount: { increment: view.viewCount } },
      });
    });
  },
};

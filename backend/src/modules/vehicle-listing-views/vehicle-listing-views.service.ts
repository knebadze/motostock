import {
  vehicleListingViewsRepository,
  type VehicleListingViewOwner,
} from "./vehicle-listing-views.repository.js";

export async function recordVehicleListingView(
  owner: VehicleListingViewOwner,
  vehicleListingId: number,
): Promise<void> {
  await vehicleListingViewsRepository.upsertView(owner, vehicleListingId);
}

// Called from guest-identity.middleware.ts's mergeGuestDataIntoUser, right
// alongside mergeGuestProductViewsIntoUser — same collision-sums-viewCount
// reasoning as that function (both rows represent genuine interest in the
// same listing, worth preserving rather than discarding).
export async function mergeGuestVehicleListingViewsIntoUser(guestId: string, userId: number) {
  const guestViews = await vehicleListingViewsRepository.findByGuestId(guestId);

  for (const view of guestViews) {
    const existing = await vehicleListingViewsRepository.findByOwnerAndVehicleListing(
      { userId },
      view.vehicleListingId,
    );
    if (existing) {
      await vehicleListingViewsRepository.incrementViewCount(existing.id, view.viewCount);
      await vehicleListingViewsRepository.delete(view.id);
    } else {
      await vehicleListingViewsRepository.reassignToUser(view.id, userId);
    }
  }
}

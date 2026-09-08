import { getGuestIdCookieMaxAgeDays } from "../settings/settings.service.js";
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
// same listing, worth preserving rather than discarding), and the same
// atomic claim-then-upsert per item (see vehicle-listing-views.repository.ts's
// mergeGuestItem) so two concurrent logins on the same guest cookie can't
// double-sum a viewCount or crash on a row the other one already claimed.
export async function mergeGuestVehicleListingViewsIntoUser(guestId: string, userId: number) {
  const guestViews = await vehicleListingViewsRepository.findByGuestId(guestId);

  for (const view of guestViews) {
    await vehicleListingViewsRepository.mergeGuestItem(view, guestId, userId);
  }
}

// Exact counterpart to product-views.service.ts's pruneStaleGuestProductViews
// — see there for the full reasoning (only guest rows are unbounded; the
// guest-id cookie's own max age is the safe cutoff, since a guestId past
// that point can never be merged into a real account or seen again).
export async function pruneStaleGuestVehicleListingViews(): Promise<number> {
  const maxAgeDays = await getGuestIdCookieMaxAgeDays();
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  return vehicleListingViewsRepository.deleteOldGuestViews(cutoff);
}

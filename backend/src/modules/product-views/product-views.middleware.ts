import type { Request, Response } from "express";
import { resolveAuthenticatedUser } from "../../middleware/auth.middleware.js";
import { resolveGuestId } from "../../middleware/guest-identity.middleware.js";
import type { ProductViewOwner } from "./product-views.repository.js";

// Always resolves to *something* — a logged-in user or the shared guest-id
// cookie — never rejects, unlike wishlist's resolveWishlistOwner. View
// tracking is a passive background signal, not a user-facing feature an
// admin can switch off, so guest tracking is unconditional (no Settings
// gate). Mutates `res` (cookie refresh / new guest cookie), so callers must
// invoke this before writing a response body.
export async function resolveProductViewOwner(req: Request, res: Response): Promise<ProductViewOwner> {
  const user = await resolveAuthenticatedUser(req, res);
  if (user) return { userId: user.sub };
  return { guestId: await resolveGuestId(req, res) };
}

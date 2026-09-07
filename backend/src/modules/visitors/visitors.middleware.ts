import type { Request, Response } from "express";
import { resolveAuthenticatedUser } from "../../middleware/auth.middleware.js";
import { resolveGuestId } from "../../middleware/guest-identity.middleware.js";
import type { VisitorOwner } from "./visitors.repository.js";

// Always resolves to *something* — a logged-in user or the shared guest-id
// cookie — never rejects, same reasoning as product-views.middleware.ts's
// resolveProductViewOwner: visitor presence is a passive background signal,
// not a user-facing feature an admin would need to switch off, so guest
// tracking here is unconditional (no Settings gate).
export async function resolveVisitorOwner(req: Request, res: Response): Promise<VisitorOwner> {
  const user = await resolveAuthenticatedUser(req, res);
  if (user) return { userId: user.sub };
  return { guestId: await resolveGuestId(req, res) };
}

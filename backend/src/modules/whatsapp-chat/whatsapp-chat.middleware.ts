import type { Request, Response } from "express";
import { resolveAuthenticatedUser } from "../../middleware/auth.middleware.js";
import { resolveGuestId } from "../../middleware/guest-identity.middleware.js";
import type { ChatOwner } from "./whatsapp-chat.repository.js";

// Always resolves to *something* — a logged-in user or the shared guest-id
// cookie — never rejects. Both authorized users and guests must be able to
// start a WhatsApp chat (no Settings gate, unlike wishlist), same
// unconditional-guest reasoning as resolveProductViewOwner.
export async function resolveChatOwner(req: Request, res: Response): Promise<ChatOwner> {
  const user = await resolveAuthenticatedUser(req, res);
  if (user) return { userId: user.sub };
  return { guestId: await resolveGuestId(req, res) };
}

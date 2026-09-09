import type { JwtPayload } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      // Set by resolveWishlistOwner/resolveCartOwner when the caller is an
      // unauthenticated visitor and that feature's guest access is enabled
      // (see settings) — a stable random id tied to the shared guest-id
      // cookie (see guest-identity.middleware.ts), not a user account.
      guestId?: string;
      // Raw pre-JSON-parse request body bytes, captured by app.ts's
      // express.json({ verify }) — needed for whatsapp-chat's webhook
      // signature check, which HMACs the exact bytes Meta signed, not the
      // reserialized parsed object (which can differ byte-for-byte).
      rawBody?: Buffer;
    }
  }
}

export {};

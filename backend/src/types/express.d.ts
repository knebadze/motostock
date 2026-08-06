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
    }
  }
}

export {};

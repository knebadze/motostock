import type { JwtPayload } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      // Set by resolveWishlistOwner when the caller is an unauthenticated
      // visitor and guest wishlist access is enabled (see settings) — a
      // stable random id tied to a long-lived cookie, not a user account.
      wishlistGuestId?: string;
    }
  }
}

export {};

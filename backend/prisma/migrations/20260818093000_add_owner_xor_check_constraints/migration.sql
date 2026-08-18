-- Enforces the "exactly one of userId/guestId" owner invariant at the
-- database level, on the 5 tables that use this dual-nullable-owner shape
-- (CartItem, WishlistItem, CompareItem, ProductView, VehicleListingView).
-- Previously enforced only in the service layer (addCartItem, wishlist/
-- compare/view-tracking services) — a bug in any of those call sites could
-- silently write a row with both null (unowned, orphaned) or both set
-- (ambiguous owner) with nothing at the DB level to catch it.

ALTER TABLE "dbo"."CartItem"
  ADD CONSTRAINT "CartItem_owner_xor_check" CHECK (("userId" IS NOT NULL) <> ("guestId" IS NOT NULL));

ALTER TABLE "dbo"."WishlistItem"
  ADD CONSTRAINT "WishlistItem_owner_xor_check" CHECK (("userId" IS NOT NULL) <> ("guestId" IS NOT NULL));

ALTER TABLE "dbo"."CompareItem"
  ADD CONSTRAINT "CompareItem_owner_xor_check" CHECK (("userId" IS NOT NULL) <> ("guestId" IS NOT NULL));

ALTER TABLE "dbo"."ProductView"
  ADD CONSTRAINT "ProductView_owner_xor_check" CHECK (("userId" IS NOT NULL) <> ("guestId" IS NOT NULL));

ALTER TABLE "dbo"."VehicleListingView"
  ADD CONSTRAINT "VehicleListingView_owner_xor_check" CHECK (("userId" IS NOT NULL) <> ("guestId" IS NOT NULL));

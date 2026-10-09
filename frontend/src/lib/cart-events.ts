import type { CartItemType } from "./api/cart";

// Lets cart-aware components that don't share React state stay in sync when
// the same product/vehicle-listing's cart row changes somewhere else on the
// page — concretely, AddToCartButton (mounted once per product/vehicle
// detail page, or once per card in a carousel) and CartDropdown (the
// header's mini-cart). CartDropdown already handles the *other* direction
// (an AddToCartButton mutation) by dropping its own cached cart on close and
// refetching on next open (see its own handleToggle comment) — this event
// closes the gap the other way: an AddToCartButton has no "reopen" moment to
// hook a refetch onto, since it stays mounted for as long as the visitor is
// on that page, so without this it kept showing a stale −/qty/+ stepper
// (pointing at a cart row id that no longer exists) after the same item was
// removed via the header dropdown, until a full page reload.
export const CART_ITEM_CHANGED_EVENT = "cart-item-changed";

export type CartItemChangedDetail = {
  itemType: CartItemType;
  // The product variant's or vehicle listing's own id (matches
  // AddToCartButton's `id` prop) — NOT the cart row's own id, which isn't
  // known to every listener ahead of time.
  itemId: number;
  // null once the row is removed entirely (quantity decremented to 0).
  cartItem: { id: number; quantity: number } | null;
};

export function dispatchCartItemChanged(detail: CartItemChangedDetail): void {
  window.dispatchEvent(new CustomEvent<CartItemChangedDetail>(CART_ITEM_CHANGED_EVENT, { detail }));
}

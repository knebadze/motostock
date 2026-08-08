import { resolveMediaUrl } from "./api/client";
import { pickLookupName } from "./format";
import type { Cart, CartItem } from "./api/cart";

// Shared by CartManager and the header's CartDropdown — both recompute
// subtotal/itemCount locally after a quantity change or removal instead of
// refetching the whole cart.
export function recomputeCart(items: CartItem[]): Cart {
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { items, subtotal, itemCount };
}

// Shared by CartManager's line rows and the header's CartDropdown preview —
// both need the same "what do we link to / show / call this" derivation
// from a CartItem's two possible sellable-unit shapes.
export function getCartItemDisplay(item: CartItem, locale: "ka" | "en" | "ru") {
  if (item.productVariant) {
    const variant = item.productVariant;
    const subtitle = [variant.size, variant.color]
      .filter((lookup): lookup is NonNullable<typeof lookup> => lookup != null)
      .map((lookup) => pickLookupName(lookup, locale))
      .join(" · ");

    return {
      href: `/${variant.product.category.slug}/${variant.product.slug}`,
      title: variant.product.name[locale],
      subtitle,
      imageUrl: resolveMediaUrl(variant.images[0]?.imageUrl ?? variant.product.imageUrl),
    };
  }

  if (item.vehicleListing) {
    const listing = item.vehicleListing;
    return {
      href: `/${listing.vehicleCatalog.category.slug}/${listing.id}`,
      title: `${listing.vehicleCatalog.brand.name[locale]} ${listing.vehicleCatalog.model.name[locale]}`,
      subtitle: `${pickLookupName(listing.color, locale)} · ${listing.year}`,
      imageUrl: resolveMediaUrl(listing.images[0]?.imageUrl ?? listing.vehicleCatalog.imageUrl),
    };
  }

  return { href: "#", title: "", subtitle: "", imageUrl: null };
}

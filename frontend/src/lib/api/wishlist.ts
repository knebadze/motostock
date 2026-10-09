import { createCollectionApi } from "./collection-api";
import type { CollectionItemType, CollectionStatusItem } from "./collection-api";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type WishlistItemType = CollectionItemType;
export type WishlistItem = Schemas["WishlistItem"];
export type WishlistStatusItem = CollectionStatusItem;
export type WishlistStatus = Schemas["WishlistStatus"];

const wishlistApi = createCollectionApi("/users/me/wishlist");

export const listMyWishlist = wishlistApi.list;
export const addToWishlist = wishlistApi.add;
export const removeFromWishlist = wishlistApi.remove;
export const getWishlistStatus = wishlistApi.getStatus;
export const getWishlistCount = wishlistApi.getCount;

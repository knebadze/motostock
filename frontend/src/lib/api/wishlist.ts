import { createCollectionApi } from "./collection-api";
import type { CollectionItem, CollectionItemType, CollectionStatus, CollectionStatusItem } from "./collection-api";

export type WishlistItemType = CollectionItemType;
export type WishlistItem = CollectionItem;
export type WishlistStatusItem = CollectionStatusItem;
export type WishlistStatus = CollectionStatus;

const wishlistApi = createCollectionApi("/users/me/wishlist");

export const listMyWishlist = wishlistApi.list;
export const addToWishlist = wishlistApi.add;
export const removeFromWishlist = wishlistApi.remove;
export const getWishlistStatus = wishlistApi.getStatus;

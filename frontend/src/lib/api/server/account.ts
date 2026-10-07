import "server-only";
import { cache } from "react";
import { fetchFromServer } from "./core";
import type { User } from "../auth";
import type { Address } from "../addresses";
import type { GarageVehicle } from "../garage";
import type { WishlistItem } from "../wishlist";
import type { MyNewsletterStatus } from "../newsletter";
import type { CompareItem } from "../compare";
import type { Cart } from "../cart";
import type { Order, OrderSummary } from "../orders";

// The signed-in customer's own data (profile, addresses, garage, wishlist, compare, cart, orders).

export const getCurrentUserFromServer = cache(async (): Promise<User | null> => {
  return fetchFromServer<{ user: User }, User | null>("/users/me", {
    fallback: null,
    extract: (data) => data.user,
    requireSession: true,
  });
});

// Backs the account-page newsletter toggle's initial render — "NOT_SUBSCRIBED"
// fallback matches what the endpoint itself returns for an account whose
// email has no NewsletterSubscriber row (see newsletter.service.ts's
// getMyStatus), so a fetch failure degrades to the same state as "never
// subscribed" rather than a distinct error state.
export const getMyNewsletterStatusFromServer = cache(async (): Promise<MyNewsletterStatus> => {
  return fetchFromServer<{ status: MyNewsletterStatus }, MyNewsletterStatus>("/newsletter/my-status", {
    fallback: "NOT_SUBSCRIBED",
    extract: (data) => data.status,
    requireAuth: true,
  });
});

export const getOAuthStatusFromServer = cache(async (): Promise<{ google: boolean; facebook: boolean }> => {
  // Public endpoint (the login/register pages read this for every guest) —
  // lets OAuthButtons hide a provider's button instead of showing one
  // that's guaranteed to fail. Fails closed: a failed fetch hides both
  // buttons rather than risk showing a broken one.
  return fetchFromServer<{ google: boolean; facebook: boolean }, { google: boolean; facebook: boolean }>(
    "/auth/oauth-status",
    { fallback: { google: false, facebook: false }, extract: (data) => data },
  );
});

export const getMyAddressesFromServer = cache(async (): Promise<Address[]> => {
  return fetchFromServer<{ addresses: Address[] }, Address[]>("/users/me/addresses", {
    fallback: [],
    extract: (data) => data.addresses,
    requireAuth: true,
  });
});

export const getMyGarageFromServer = cache(async (): Promise<GarageVehicle[]> => {
  return fetchFromServer<{ items: GarageVehicle[] }, GarageVehicle[]>("/users/me/garage", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

export const getMyWishlistFromServer = cache(async (): Promise<WishlistItem[]> => {
  return fetchFromServer<{ items: WishlistItem[] }, WishlistItem[]>("/users/me/wishlist", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

// Lightweight — just the header badge count, not the full wishlist with
// every nested product/vehicle detail. Same reasoning as
// getMyCartCountFromServer.
export const getMyWishlistCountFromServer = cache(async (): Promise<number> => {
  return fetchFromServer<{ count: number }, number>("/users/me/wishlist/count", {
    fallback: 0,
    extract: (data) => data.count,
    requireAuth: true,
  });
});

export const getMyCompareFromServer = cache(async (): Promise<CompareItem[]> => {
  return fetchFromServer<{ items: CompareItem[] }, CompareItem[]>("/users/me/compare", {
    fallback: [],
    extract: (data) => data.items,
    requireAuth: true,
  });
});

// Lightweight — just the header badge count, not the full comparison list
// with every nested product/vehicle detail. Same reasoning as
// getMyCartCountFromServer.
export const getMyCompareCountFromServer = cache(async (): Promise<number> => {
  return fetchFromServer<{ count: number }, number>("/users/me/compare/count", {
    fallback: 0,
    extract: (data) => data.count,
    requireAuth: true,
  });
});

const EMPTY_CART: Cart = { items: [], subtotal: 0, itemCount: 0 };

export const getMyCartFromServer = cache(async (): Promise<Cart> => {
  return fetchFromServer<Cart, Cart>("/users/me/cart", {
    fallback: EMPTY_CART,
    extract: (data) => data,
    requireAuth: true,
  });
});

// Lightweight — just the header badge count, not the full cart with every
// nested product/vehicle detail. Safe to call on every page load (see
// (guest)/layout.tsx), unlike getMyCartFromServer.
export const getMyCartCountFromServer = cache(async (): Promise<number> => {
  return fetchFromServer<{ count: number }, number>("/users/me/cart/count", {
    fallback: 0,
    extract: (data) => data.count,
    requireAuth: true,
  });
});

export const getMyOrdersFromServer = cache(async (): Promise<OrderSummary[]> => {
  return fetchFromServer<{ orders: OrderSummary[] }, OrderSummary[]>("/orders/me", {
    fallback: [],
    extract: (data) => data.orders,
    requireAuth: true,
  });
});

export const getMyOrderFromServer = cache(async (id: number): Promise<Order | null> => {
  return fetchFromServer<{ order: Order }, Order | null>(`/orders/me/${id}`, {
    fallback: null,
    extract: (data) => data.order,
    requireAuth: true,
  });
});

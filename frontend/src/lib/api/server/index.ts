import "server-only";

// Server-side (SSR) data getters, split by area — see each file. Import
// from "@/lib/api/server" as before; this barrel re-exports them all.

export type { AdminListPage } from "./core";
export * from "./settings";
export * from "./content";
export * from "./account";
export * from "./catalog";
export * from "./products";
export * from "./vehicles";
export * from "./admin";

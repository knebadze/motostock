import { createCollectionApi } from "./collection-api";
import type { CollectionItemType, CollectionStatusItem } from "./collection-api";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type CompareItemType = CollectionItemType;
export type CompareItem = Schemas["CompareItem"];
export type CompareStatusItem = CollectionStatusItem;
export type CompareStatus = Schemas["CompareStatus"];

const compareApi = createCollectionApi("/users/me/compare");

export const listMyCompare = compareApi.list;
export const addToCompare = compareApi.add;
export const removeFromCompare = compareApi.remove;
export const getCompareStatus = compareApi.getStatus;
export const getCompareCount = compareApi.getCount;

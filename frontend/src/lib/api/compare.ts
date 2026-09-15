import { createCollectionApi } from "./collection-api";
import type { CollectionItem, CollectionItemType, CollectionStatus, CollectionStatusItem } from "./collection-api";

export type CompareItemType = CollectionItemType;
export type CompareItem = CollectionItem;
export type CompareStatusItem = CollectionStatusItem;
export type CompareStatus = CollectionStatus;

const compareApi = createCollectionApi("/users/me/compare");

export const listMyCompare = compareApi.list;
export const addToCompare = compareApi.add;
export const removeFromCompare = compareApi.remove;
export const getCompareStatus = compareApi.getStatus;

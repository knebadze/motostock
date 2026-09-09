// Barrel — settings.service.ts (the only real consumer; nothing outside
// this module imports these raw keys/defaults directly except prisma/seed.ts,
// which needs USE_CLOUD_STORAGE_KEY to seed its initial row) imports
// everything from here rather than from each individual file, and this is
// also the one place ALL_SETTING_KEYS is assembled — from the 10 per-domain
// arrays below, not hand-maintained as its own separate literal list the
// way it used to be (which could silently drift if a key was ever added to
// one domain's file but forgotten here).
export * from "./general.constants.js";
export * from "./delivery.constants.js";
export * from "./fraud.constants.js";
export * from "./fina.constants.js";
export * from "./cart-compare.constants.js";
export * from "./analytics-dashboard.constants.js";
export * from "./search-recommendations.constants.js";
export * from "./session-auth.constants.js";
export * from "./image.constants.js";
export * from "./cache.constants.js";

import { GENERAL_SETTING_KEYS } from "./general.constants.js";
import { DELIVERY_SETTING_KEYS } from "./delivery.constants.js";
import { FRAUD_SETTING_KEYS } from "./fraud.constants.js";
import { FINA_SETTING_KEYS } from "./fina.constants.js";
import { CART_COMPARE_SETTING_KEYS } from "./cart-compare.constants.js";
import { ANALYTICS_DASHBOARD_SETTING_KEYS } from "./analytics-dashboard.constants.js";
import { SEARCH_RECOMMENDATIONS_SETTING_KEYS } from "./search-recommendations.constants.js";
import { SESSION_AUTH_SETTING_KEYS } from "./session-auth.constants.js";
import { IMAGE_SETTING_KEYS } from "./image.constants.js";
import { CACHE_SETTING_KEYS } from "./cache.constants.js";

export const ALL_SETTING_KEYS: string[] = [
  ...GENERAL_SETTING_KEYS,
  ...DELIVERY_SETTING_KEYS,
  ...FRAUD_SETTING_KEYS,
  ...FINA_SETTING_KEYS,
  ...CART_COMPARE_SETTING_KEYS,
  ...ANALYTICS_DASHBOARD_SETTING_KEYS,
  ...SEARCH_RECOMMENDATIONS_SETTING_KEYS,
  ...SESSION_AUTH_SETTING_KEYS,
  ...IMAGE_SETTING_KEYS,
  ...CACHE_SETTING_KEYS,
];

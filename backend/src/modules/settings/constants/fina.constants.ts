// Mirrors the admin UI's FinaSettingsTab.tsx grouping.
//
// finaWebCustomerId/finaWebUserId are nullable with NO built-in default —
// unlike every other setting, a wrong FINA contragent/user id would
// silently write sales to the wrong account, so these stay null until an
// admin explicitly sets them (same "dormant until configured" spirit as
// fina-client.ts's isFinaConfigured()) rather than falling back to some
// in-code guess.
export const FINA_WEB_CUSTOMER_ID_KEY = "fina_web_customer_id";
export const FINA_WEB_USER_ID_KEY = "fina_web_user_id";
export const FINA_SYNC_INTERVAL_MINUTES_KEY = "fina_sync_interval_minutes";

export const FINA_SETTING_KEYS = [
  FINA_WEB_CUSTOMER_ID_KEY,
  FINA_WEB_USER_ID_KEY,
  FINA_SYNC_INTERVAL_MINUTES_KEY,
];

export const FINA_SYNC_DEFAULTS = { intervalMinutes: 15 };

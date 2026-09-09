// Mirrors the admin UI's SessionAuthSettingsTab.tsx grouping.
export const SESSION_IDLE_TTL_MINUTES_KEY = "session_idle_ttl_minutes";
export const SESSION_ABSOLUTE_TTL_DAYS_KEY = "session_absolute_ttl_days";
export const RESET_TOKEN_TTL_MINUTES_KEY = "reset_token_ttl_minutes";
export const VERIFICATION_TOKEN_TTL_HOURS_KEY = "verification_token_ttl_hours";
export const GUEST_ID_COOKIE_MAX_AGE_DAYS_KEY = "guest_id_cookie_max_age_days";

export const SESSION_AUTH_SETTING_KEYS = [
  SESSION_IDLE_TTL_MINUTES_KEY,
  SESSION_ABSOLUTE_TTL_DAYS_KEY,
  RESET_TOKEN_TTL_MINUTES_KEY,
  VERIFICATION_TOKEN_TTL_HOURS_KEY,
  GUEST_ID_COOKIE_MAX_AGE_DAYS_KEY,
];

export const SESSION_DEFAULTS = {
  idleTtlMinutes: 120,
  absoluteTtlDays: 30,
  resetTokenTtlMinutes: 60,
  verificationTokenTtlHours: 24,
  guestIdCookieMaxAgeDays: 365,
};

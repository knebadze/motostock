// Mirrors the admin UI's FraudSettingsTab.tsx grouping.
export const FRAUD_VELOCITY_ORDER_COUNT_KEY = "fraud_velocity_order_count";
export const FRAUD_VELOCITY_WINDOW_MINUTES_KEY = "fraud_velocity_window_minutes";
export const FRAUD_NEW_ACCOUNT_WINDOW_HOURS_KEY = "fraud_new_account_window_hours";
export const FRAUD_HIGH_VALUE_THRESHOLD_KEY = "fraud_high_value_threshold";
export const FRAUD_FAILED_LOGIN_THRESHOLD_KEY = "fraud_failed_login_threshold";
export const FRAUD_FAILED_LOGIN_WINDOW_MINUTES_KEY = "fraud_failed_login_window_minutes";

export const FRAUD_SETTING_KEYS = [
  FRAUD_VELOCITY_ORDER_COUNT_KEY,
  FRAUD_VELOCITY_WINDOW_MINUTES_KEY,
  FRAUD_NEW_ACCOUNT_WINDOW_HOURS_KEY,
  FRAUD_HIGH_VALUE_THRESHOLD_KEY,
  FRAUD_FAILED_LOGIN_THRESHOLD_KEY,
  FRAUD_FAILED_LOGIN_WINDOW_MINUTES_KEY,
];

// In-code fallback for every one of the keys above — what the app already
// behaved like before these became admin-editable, so an unconfigured
// install (or a deleted row) is indistinguishable from today's hardcoded
// behavior.
export const FRAUD_DEFAULTS = {
  velocityOrderCount: 3,
  velocityWindowMinutes: 30,
  newAccountWindowHours: 24,
  highValueThreshold: 1000,
  failedLoginThreshold: 5,
  failedLoginWindowMinutes: 15,
};

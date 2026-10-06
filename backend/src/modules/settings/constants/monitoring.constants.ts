// Error monitoring — mirrors the admin UI's MonitoringSettingsTab.tsx.
// Off by default; also needs SENTRY_DSN in the environment (the project key
// never lives in the DB — see config/env.ts). Sentry's own alert emails go
// to the Sentry account's members, configured on sentry.io — not from here.
export const SENTRY_ENABLED_KEY = "sentry_enabled";

export const MONITORING_SETTING_KEYS = [SENTRY_ENABLED_KEY];

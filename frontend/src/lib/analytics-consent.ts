// Google Analytics consent (Consent Mode v2). Shared by GoogleAnalytics.tsx
// (server — reads the stored choice in its inline init script, before
// gtag.js loads) and CookieNotice.tsx (client — records the choice and
// pushes a consent update). Inert while NEXT_PUBLIC_GA_MEASUREMENT_ID is
// unset: the site then sets only strictly necessary cookies and the notice
// stays a plain dismissible message.
export const GA_ENABLED = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

// localStorage, not a cookie — same reasoning as the plain notice's
// dismissal: no need to spend a cookie on remembering a cookie choice.
export const ANALYTICS_CONSENT_STORAGE_KEY = "motostock_analytics_consent";

export type AnalyticsConsent = "granted" | "denied";

type Gtag = (command: "consent", action: "update", params: Record<string, AnalyticsConsent>) => void;

export function saveAnalyticsConsent(consent: AnalyticsConsent) {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Storage blocked (private mode etc.) — the choice still applies to
    // this page view via the update below, it just won't be remembered.
  }
  (window as unknown as { gtag?: Gtag }).gtag?.("consent", "update", { analytics_storage: consent });
}

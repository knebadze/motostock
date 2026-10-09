"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  GA_ENABLED,
  saveAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analytics-consent";

// Presence of this key = "banner already answered" (ChatWidget and
// ScrollToTopButton read it too, to know whether to sit clear of the bar).
// With GA on, it's the consent choice itself — so a visitor who dismissed
// the old necessary-only notice before analytics existed still gets asked.
export const COOKIE_NOTICE_STORAGE_KEY = GA_ENABLED
  ? ANALYTICS_CONSENT_STORAGE_KEY
  : "motostock_cookie_notice_dismissed";
// Same-tab localStorage writes don't fire a "storage" event (that only
// fires in *other* tabs) — ScrollToTopButton listens for this to know when
// to drop back down instead of staying clear of the dismissed banner.
export const COOKIE_NOTICE_DISMISSED_EVENT = "motostock:cookie-notice-dismissed";

// Read by globals.css's `body { padding-bottom: var(--cookie-notice-height) }`
// — reserves matching space at the end of the page so this fixed bar never
// overlaps real content on short pages (e.g. Register's submit button,
// Checkout's fields at mobile widths), the same way a gap would appear
// below the footer if the banner were a normal in-flow element.
const COOKIE_NOTICE_HEIGHT_VAR = "--cookie-notice-height";

// Without GA, every cookie this site sets (auth session, guest cart/
// wishlist/compare identity, OAuth CSRF state) is strictly necessary, so
// this is a plain dismissible notice. With GA on, it becomes an accept/
// reject consent banner (Consent Mode v2 — see GoogleAnalytics.tsx), with
// rejecting as easy as accepting. Remembered in localStorage, not a cookie.
export function CookieNotice() {
  const t = useTranslations("CookieNotice");
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY)) setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      document.documentElement.style.setProperty(COOKIE_NOTICE_HEIGHT_VAR, "0px");
      return;
    }

    const el = bannerRef.current;
    if (!el) return;

    // ResizeObserver (not a one-off measurement) so the reserved space stays
    // correct if the banner's own height changes after mount — e.g. its text
    // wrapping to two lines on a narrow phone, or on rotation.
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty(COOKIE_NOTICE_HEIGHT_VAR, `${el.offsetHeight}px`);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty(COOKIE_NOTICE_HEIGHT_VAR, "0px");
    };
  }, [visible]);

  function dismiss(consent?: AnalyticsConsent) {
    if (consent) {
      saveAnalyticsConsent(consent);
    } else {
      window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, "1");
    }
    setVisible(false);
    window.dispatchEvent(new Event(COOKIE_NOTICE_DISMISSED_EVENT));
  }

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-4 py-4 shadow-lg sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {GA_ENABLED ? t("analyticsMessage") : t("message")}{" "}
          <Link
            href={GA_ENABLED ? "/privacy" : "/terms"}
            className="font-medium text-primary-text hover:underline"
          >
            {t("linkLabel")}
          </Link>
        </p>
        {GA_ENABLED ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => dismiss("denied")}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-text"
            >
              {t("rejectLabel")}
            </button>
            <button
              type="button"
              onClick={() => dismiss("granted")}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {t("acceptAllLabel")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => dismiss()}
            className="shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {t("acceptLabel")}
          </button>
        )}
      </div>
    </div>
  );
}

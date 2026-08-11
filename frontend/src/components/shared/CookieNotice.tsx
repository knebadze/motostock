"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export const COOKIE_NOTICE_STORAGE_KEY = "motostock_cookie_notice_dismissed";
// Same-tab localStorage writes don't fire a "storage" event (that only
// fires in *other* tabs) — ScrollToTopButton listens for this to know when
// to drop back down instead of staying clear of the dismissed banner.
export const COOKIE_NOTICE_DISMISSED_EVENT = "motostock:cookie-notice-dismissed";

// Every cookie this site sets (auth session, guest cart/wishlist/compare
// identity, OAuth CSRF state) is strictly necessary — there's no
// tracking/marketing cookie to gate behind an accept/reject choice, so this
// is a plain dismissible notice, not a consent manager. Dismissal is
// remembered in localStorage, not a cookie — no need to spend one just to
// remember "seen the cookie notice".
export function CookieNotice() {
  const t = useTranslations("CookieNotice");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, "1");
    setVisible(false);
    window.dispatchEvent(new Event(COOKIE_NOTICE_DISMISSED_EVENT));
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-4 py-4 shadow-lg sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("message")}{" "}
          <Link href="/terms" className="font-medium text-primary hover:underline">
            {t("linkLabel")}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {t("acceptLabel")}
        </button>
      </div>
    </div>
  );
}

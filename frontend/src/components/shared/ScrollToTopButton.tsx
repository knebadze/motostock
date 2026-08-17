"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { COOKIE_NOTICE_DISMISSED_EVENT, COOKIE_NOTICE_STORAGE_KEY } from "./CookieNotice";
import { CHAT_WIDGET_OPEN_CHANGED_EVENT } from "./ChatWidget";

const SCROLL_THRESHOLD_PX = 400;

export function ScrollToTopButton() {
  const t = useTranslations("ScrollToTop");
  const [visible, setVisible] = useState(false);
  // Tracked separately so the button can sit clear of CookieNotice's fixed
  // bottom bar instead of overlapping it, and drop back down once that's
  // dismissed (see CookieNotice.tsx).
  const [cookieNoticeVisible, setCookieNoticeVisible] = useState(false);
  // ChatWidget shares this same bottom-right corner, stacked just below —
  // that fixed offset only accounts for its collapsed toggle button, not
  // the much taller open panel, so this button just steps aside entirely
  // while the panel is open (see ChatWidget.tsx).
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCookieNoticeVisible(!window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY));
    function handleDismissed() {
      setCookieNoticeVisible(false);
    }
    window.addEventListener(COOKIE_NOTICE_DISMISSED_EVENT, handleDismissed);
    return () => window.removeEventListener(COOKIE_NOTICE_DISMISSED_EVENT, handleDismissed);
  }, []);

  useEffect(() => {
    function handleChatToggled(event: Event) {
      setChatOpen((event as CustomEvent<{ open: boolean }>).detail.open);
    }
    window.addEventListener(CHAT_WIDGET_OPEN_CHANGED_EVENT, handleChatToggled);
    return () => window.removeEventListener(CHAT_WIDGET_OPEN_CHANGED_EVENT, handleChatToggled);
  }, []);

  if (!visible || chatOpen) return null;

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={t("label")}
      className={`fixed right-4 z-40 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-[bottom] duration-200 hover:bg-primary-hover sm:right-6 ${
        cookieNoticeVisible ? "bottom-40 sm:bottom-44" : "bottom-20"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}

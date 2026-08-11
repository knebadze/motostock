"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LANGUAGE_LABELS: Record<string, string> = {
  ka: "ქართული",
  en: "English",
  ru: "Русский",
};

const LANGUAGE_CODES: Record<string, string> = {
  ka: "GE",
  en: "EN",
  ru: "RU",
};

// Merges what used to be two separate header buttons (LanguageSwitcher,
// ThemeToggle) into one — both are low-frequency choices, so they don't
// each need permanent header real estate.
export function SettingsDropdown() {
  const locale = useLocale();
  const t = useTranslations("Header");
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Required next-themes pattern: theme is unknown until after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("settings")}
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary sm:size-9"
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
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("language")}
          </p>
          {routing.locales.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={code === locale}
              onClick={() => {
                setOpen(false);
                // Hard navigation: [locale] defines a root layout (html/body +
                // next-themes), so a soft client transition re-renders it in
                // place and next-themes' pre-hydration script gets inserted via
                // React instead of parsed by the browser, which React flags as
                // an error. A full navigation avoids that.
                window.location.href = getPathname({ href: pathname, locale: code });
              }}
              className={`flex w-full items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-muted hover:text-primary ${
                code === locale ? "text-primary" : "text-foreground"
              }`}
            >
              <span>{LANGUAGE_LABELS[code]}</span>
              <span className="text-xs text-muted-foreground">{LANGUAGE_CODES[code]}</span>
            </button>
          ))}

          {mounted && (
            <div className="border-t border-border px-4 pb-2 pt-2">
              <p className="pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("themeHeading")}
              </p>
              <div className="flex gap-1 rounded-full border border-border p-1">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  aria-label={t("switchToLight")}
                  aria-pressed={!isDark}
                  className={`flex flex-1 items-center justify-center rounded-full py-1.5 transition-colors ${
                    !isDark
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm9-6a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM5 12a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm12.66-6.66a1 1 0 0 1 0 1.42l-.71.7a1 1 0 1 1-1.41-1.41l.7-.71a1 1 0 0 1 1.42 0ZM8.46 16.24a1 1 0 0 1 0 1.42l-.71.7a1 1 0 1 1-1.41-1.41l.7-.71a1 1 0 0 1 1.42 0Zm9.9 2.12a1 1 0 0 1-1.42 0l-.7-.71a1 1 0 1 1 1.41-1.41l.71.7a1 1 0 0 1 0 1.42ZM7.75 7.75a1 1 0 0 1-1.42 0l-.7-.71a1 1 0 0 1 1.41-1.41l.71.7a1 1 0 0 1 0 1.42ZM12 20a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  aria-label={t("switchToDark")}
                  aria-pressed={isDark}
                  className={`flex flex-1 items-center justify-center rounded-full py-1.5 transition-colors ${
                    isDark
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <path d="M21.64 13a1 1 0 0 0-1.05-.14 8.05 8.05 0 0 1-3.37.73 8.15 8.15 0 0 1-8.14-8.1 8.59 8.59 0 0 1 .25-2A1 1 0 0 0 8 2.36a10.14 10.14 0 1 0 13.94 11.69 1 1 0 0 0-.3-1.05Z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

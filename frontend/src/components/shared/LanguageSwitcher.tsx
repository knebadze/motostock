"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = {
  ka: "ქართული",
  en: "English",
  ru: "Русский",
};

const CODES: Record<string, string> = {
  ka: "GE",
  en: "EN",
  ru: "RU",
};

// `compact`: a borderless, small-scale trigger for tight spaces (the
// desktop utility bar's h-10 row, the mobile drawer's inline row) — the
// default bordered pill is sized for the main header row and clips against
// a thinner container.
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("Header");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language")}
        className={
          compact
            ? "flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            : "flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border border-border px-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary sm:h-9 sm:px-3"
        }
      >
        {CODES[locale]}
        {compact && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {open && (
        <ul
          role="listbox"
          className={`absolute right-0 z-50 w-36 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg ${
            compact ? "top-6" : "top-11"
          }`}
        >
          {routing.locales.map((code) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={code === locale}
                onClick={() => {
                  setOpen(false);
                  // Hard navigation: [locale] defines a root layout (html/body +
                  // next-themes), so a soft client transition re-renders it in
                  // place and next-themes' pre-hydration script gets inserted via
                  // React instead of parsed by the browser, which React flags as
                  // an error. A full navigation avoids that.
                  window.location.href = getPathname({
                    href: pathname,
                    locale: code,
                  });
                }}
                className={`flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-muted hover:text-primary ${
                  code === locale ? "text-primary" : "text-foreground"
                }`}
              >
                {LABELS[code]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

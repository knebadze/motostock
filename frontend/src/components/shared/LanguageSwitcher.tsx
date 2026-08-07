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

export function LanguageSwitcher() {
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
        className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-full border border-border px-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary sm:h-9 sm:px-3"
      >
        {CODES[locale]}
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-11 z-50 w-36 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
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

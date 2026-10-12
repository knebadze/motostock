"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { resolveMediaUrl } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import {
  SEARCH_MIN_LENGTH,
  clearRecentSearches,
  getSearchSuggestions,
  readRecentSearches,
  rememberRecentSearch,
  type SearchSuggestions,
} from "@/lib/api/search";

const SUGGEST_DEBOUNCE_MS = 250;

type Locale = "ka" | "en" | "ru";

// One keyboard-navigable row of the dropdown, in display order.
type SuggestionItem = {
  key: string;
  href: { pathname: string; query?: Record<string, string> };
  // Recorded as a recent search when chosen (the query itself for "view
  // all"/recent rows; the shopper's typed text for a direct hit).
  rememberQuery: string;
  content: ReactNode;
};

const searchIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4"
    aria-hidden
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

function Thumbnail({ src, alt }: { src: string | null; alt: string }) {
  const url = resolveMediaUrl(src);
  return (
    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
      {url && <Image src={url} alt={alt} fill sizes="40px" className="object-cover" />}
    </span>
  );
}

function PriceLine({
  price,
  discountPrice,
  currency = "GEL",
}: {
  price: number | null;
  discountPrice: number | null;
  currency?: "GEL" | "USD";
}) {
  if (price == null) return null;
  return discountPrice != null ? (
    <span className="flex shrink-0 flex-col items-end text-xs">
      <span className="font-semibold text-primary-text">{formatPrice(discountPrice, currency)}</span>
      <span className="text-muted-foreground line-through">{formatPrice(price, currency)}</span>
    </span>
  ) : (
    <span className="shrink-0 text-xs font-semibold text-foreground">{formatPrice(price, currency)}</span>
  );
}

// The header's global search (logo row on desktop, the search panel on
// mobile): a combobox with a live dropdown of top matching categories,
// vehicle listings and products (GET /search/suggest), recent searches when
// empty, full keyboard navigation, and Enter / "view all" -> the /search
// results page. `inline` renders the dropdown in normal flow (the mobile
// panel) instead of as a floating popover under the input.
export function HeaderSearch({
  inline = false,
  autoFocus = false,
  onNavigate,
}: {
  inline?: boolean;
  autoFocus?: boolean;
  // Called after navigating somewhere (lets the mobile panel close itself).
  onNavigate?: () => void;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Search");
  const router = useRouter();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchSuggestions | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  const trimmed = query.trim();
  const isSearchable = trimmed.length >= SEARCH_MIN_LENGTH;

  // Close on a click/tap outside.
  useEffect(() => {
    if (!open || inline) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, inline]);

  // Abort/clear pending work on unmount.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  function fetchSuggestions(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    if (value.trim().length < SEARCH_MIN_LENGTH) {
      setResults(null);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      getSearchSuggestions(value.trim(), controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          setResults(data);
          setStatus("idle");
          setActiveIndex(-1);
        })
        .catch(() => {
          // An aborted request was superseded by a newer keystroke.
          if (controller.signal.aborted) return;
          setResults(null);
          setStatus("error");
        });
    }, SUGGEST_DEBOUNCE_MS);
  }

  function handleChange(value: string) {
    setQuery(value);
    setOpen(true);
    setActiveIndex(-1);
    fetchSuggestions(value);
  }

  function openDropdown() {
    setRecent(readRecentSearches());
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function go(href: SuggestionItem["href"], rememberQuery: string) {
    rememberRecentSearch(rememberQuery);
    closeDropdown();
    inputRef.current?.blur();
    router.push(href);
    onNavigate?.();
  }

  function submitSearch() {
    if (!isSearchable) return;
    go({ pathname: "/search", query: { q: trimmed } }, trimmed);
  }

  // ---- the rows, in display/keyboard order ----
  const sections: { title: string; items: SuggestionItem[] }[] = [];
  if (!isSearchable) {
    if (recent.length > 0) {
      sections.push({
        title: t("recent"),
        items: recent.map((term) => ({
          key: `recent-${term}`,
          href: { pathname: "/search", query: { q: term } },
          rememberQuery: term,
          content: (
            <span className="flex items-center gap-3 text-sm text-foreground">
              <span className="text-muted-foreground">{searchIcon}</span>
              {term}
            </span>
          ),
        })),
      });
    }
  } else if (results) {
    if (results.categories.length > 0) {
      sections.push({
        title: t("categories"),
        items: results.categories.map((category) => ({
          key: `category-${category.id}`,
          href: { pathname: `/${category.slug}` },
          rememberQuery: trimmed,
          content: (
            <span className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{category.name[locale]}</span>
              {category.parentName && (
                <span className="text-xs text-muted-foreground">{category.parentName[locale]}</span>
              )}
            </span>
          ),
        })),
      });
    }
    if (results.vehicleListings.length > 0) {
      sections.push({
        title: t("vehicles"),
        items: results.vehicleListings.map((listing) => ({
          key: `vehicle-${listing.id}`,
          href: { pathname: `/${listing.categorySlug}/${listing.itemSlug}` },
          rememberQuery: trimmed,
          content: (
            <span className="flex w-full items-center gap-3">
              <Thumbnail src={listing.imageUrl} alt={listing.title} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{listing.title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {listing.year} · {listing.categoryName[locale]}
                </span>
              </span>
              <PriceLine price={listing.price} discountPrice={listing.discountPrice} currency={listing.priceCurrency} />
            </span>
          ),
        })),
      });
    }
    if (results.products.length > 0) {
      sections.push({
        title: t("products"),
        items: results.products.map((product) => ({
          key: `product-${product.id}`,
          href: { pathname: `/${product.categorySlug}/${product.slug}` },
          rememberQuery: trimmed,
          content: (
            <span className="flex w-full items-center gap-3">
              <Thumbnail src={product.imageUrl} alt={product.name[locale]} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{product.name[locale]}</span>
                <span className="truncate text-xs text-muted-foreground">{product.categoryName[locale]}</span>
              </span>
              <PriceLine price={product.price} discountPrice={product.discountPrice} />
            </span>
          ),
        })),
      });
    }
  }
  const hasResults = sections.some((section) => section.items.length > 0);
  const viewAllItem: SuggestionItem | null =
    isSearchable && results && hasResults
      ? {
          key: "view-all",
          href: { pathname: "/search", query: { q: trimmed } },
          rememberQuery: trimmed,
          content: <span className="text-sm font-semibold text-primary-text">{t("viewAllResults")} →</span>,
        }
      : null;
  const flatItems = [...sections.flatMap((section) => section.items), ...(viewAllItem ? [viewAllItem] : [])];

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (flatItems.length === 0) return;
      event.preventDefault();
      if (!open) openDropdown();
      setActiveIndex((current) => {
        if (event.key === "ArrowDown") return current >= flatItems.length - 1 ? 0 : current + 1;
        return current <= 0 ? flatItems.length - 1 : current - 1;
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      const active = activeIndex >= 0 ? flatItems[activeIndex] : null;
      if (active) go(active.href, active.rememberQuery);
      else submitSearch();
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        closeDropdown();
      } else if (query) {
        handleChange("");
      }
    } else if (event.key === "Tab") {
      closeDropdown();
    }
  }

  const showDropdown = open && (isSearchable || recent.length > 0 || query.trim().length > 0);
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined;

  let optionIndex = -1;
  const renderOption = (item: SuggestionItem) => {
    optionIndex += 1;
    const index = optionIndex;
    const isActive = index === activeIndex;
    return (
      <li
        key={item.key}
        id={`${listboxId}-${index}`}
        role="option"
        aria-selected={isActive}
        // mousedown, not click: fires before the input's blur, and keeps
        // focus where it is.
        onMouseDown={(event) => {
          event.preventDefault();
          go(item.href, item.rememberQuery);
        }}
        onMouseEnter={() => setActiveIndex(index)}
        className={`flex cursor-pointer items-center rounded-lg px-3 py-2 ${isActive ? "bg-muted" : ""}`}
      >
        {item.content}
      </li>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
        className="relative"
      >
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {searchIcon}
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          maxLength={100}
          placeholder={t("placeholder")}
          aria-label={t("label")}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          enterKeyHint="search"
          autoComplete="off"
          className="h-10 w-full rounded-full border border-border bg-muted/40 pl-10 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              handleChange("");
              inputRef.current?.focus();
            }}
            aria-label={t("clear")}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </form>

      {showDropdown && (
        <div
          className={
            inline
              ? "mt-3"
              : "absolute inset-x-0 top-full z-50 mt-2 max-h-[min(70vh,32rem)] overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-xl"
          }
        >
          {!isSearchable ? (
            recent.length > 0 ? (
              <div>
                <div className="flex items-center justify-between px-3 pb-1 pt-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("recent")}
                  </span>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      clearRecentSearches();
                      setRecent([]);
                      setActiveIndex(-1);
                    }}
                    className="text-xs text-muted-foreground transition-colors hover:text-primary-text"
                  >
                    {t("clearRecent")}
                  </button>
                </div>
                <ul id={listboxId} role="listbox" aria-label={t("recent")}>
                  {sections[0]?.items.map(renderOption)}
                </ul>
              </div>
            ) : (
              <p className="px-3 py-3 text-sm text-muted-foreground">{t("minChars", { count: SEARCH_MIN_LENGTH })}</p>
            )
          ) : status === "error" ? (
            <p className="px-3 py-3 text-sm text-red-600">{t("error")}</p>
          ) : !results || (status === "loading" && !hasResults) ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">{t("searching")}</p>
          ) : !hasResults ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">{t("noResults", { q: trimmed })}</p>
          ) : (
            <ul id={listboxId} role="listbox" aria-label={t("label")} className="flex flex-col gap-1">
              {sections.map((section) => (
                <li key={section.title} role="presentation">
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </p>
                  <ul role="presentation">{section.items.map(renderOption)}</ul>
                </li>
              ))}
              {viewAllItem && (
                <li role="presentation" className="mt-1 border-t border-border pt-1">
                  <ul role="presentation">{renderOption(viewAllItem)}</ul>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Select } from "./Select";

type Locale = "ka" | "en" | "ru";

// A fully custom calendar dropdown, not a styled native <input type="date">
// — the native picker's own popup content (month grid, "today" styling, …)
// can't be restyled via CSS at all, so re-skinning only the closed field
// left the actual dropdown looking like every other site's default browser
// widget. This renders the whole thing itself, matching Select.tsx's own
// portal-positioned dropdown so the two feel like one design system.
const MONTH_NAMES: Record<Locale, string[]> = {
  ka: [
    "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
    "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  ru: [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ],
};

// Monday-first, matching the grid layout below.
const WEEKDAY_NAMES: Record<Locale, string[]> = {
  ka: ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვ"],
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
};

const COPY: Record<Locale, { placeholder: string; today: string; clear: string; month: string; year: string }> = {
  ka: { placeholder: "აირჩიეთ თარიღი", today: "დღეს", clear: "გასუფთავება", month: "თვე", year: "წელი" },
  en: { placeholder: "Select date", today: "Today", clear: "Clear", month: "Month", year: "Year" },
  ru: { placeholder: "Выберите дату", today: "Сегодня", clear: "Очистить", month: "Месяц", year: "Год" },
};

const PANEL_WIDTH_PX = 288;
const ESTIMATED_PANEL_HEIGHT_PX = 372;
const CURRENT_YEAR = new Date().getFullYear();
// A generous static span either side of today covers every real use of this
// field (date of birth, service/discount/order dates) without needing to
// compute per-caller bounds.
const YEAR_MIN = CURRENT_YEAR - 100;
const YEAR_MAX = CURRENT_YEAR + 10;

const calendarIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-4 shrink-0"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const chevronLeft = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const chevronRight = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseIso(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function formatDisplay(value: string): string {
  const parsed = parseIso(value);
  return parsed ? `${pad(parsed.d)}.${pad(parsed.m + 1)}.${parsed.y}` : "";
}

// Always 42 cells (6 full Monday-first weeks) so the panel's height never
// jumps between a 4-week and 6-week month — Date's own overflow handling
// (day 0, day 32, …) does the previous/next-month math for free.
function buildGridDays(y: number, m: number) {
  const first = new Date(y, m, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(y, m, 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return {
      y: date.getFullYear(),
      m: date.getMonth(),
      d: date.getDate(),
      inMonth: date.getMonth() === m,
      iso: toIso(date.getFullYear(), date.getMonth(), date.getDate()),
    };
  });
}

type PanelPosition = { left: number; width: number } & (
  | { direction: "down"; top: number }
  | { direction: "up"; bottom: number }
);

export function DateInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  min,
  max,
  ariaLabel,
  locale = "ka",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  // ISO "YYYY-MM-DD" bounds — out-of-range days render disabled in the grid.
  min?: string;
  max?: string;
  ariaLabel?: string;
  locale?: Locale;
}) {
  const copy = COPY[locale];
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(CURRENT_YEAR);
  const [viewMonth, setViewMonth] = useState(0);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openPanel() {
    const parsed = parseIso(value);
    const now = new Date();
    setViewYear(parsed?.y ?? now.getFullYear());
    setViewMonth(parsed?.m ?? now.getMonth());
    setOpen(true);
  }

  function closePanel() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      // The month/year Select's own dropdown (and its search box, for the
      // year one) portals to document.body as a sibling, not a descendant
      // of panelRef — without this, picking a month/year, or clicking into
      // the year search box, would look like an "outside" click and close
      // the whole calendar before the selection ever registers.
      if (target instanceof Element && target.closest('[role="listbox"], [role="option"], [role="combobox"]')) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Portal-positioned exactly like Select.tsx's own dropdown (same flip-
  // upward-when-cramped heuristic) — kept as its own copy since this panel's
  // size is fixed rather than content-driven, unlike Select's scrollable list.
  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = containerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const gap = 4;
      const spaceBelow = viewportHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const left = Math.min(rect.left, Math.max(8, viewportWidth - PANEL_WIDTH_PX - 8));
      const openUpward = spaceBelow < ESTIMATED_PANEL_HEIGHT_PX && spaceAbove > spaceBelow;

      setPosition(
        openUpward
          ? { direction: "up", bottom: viewportHeight - rect.top + gap, left, width: PANEL_WIDTH_PX }
          : { direction: "down", top: rect.bottom + gap, left, width: PANEL_WIDTH_PX },
      );
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const monthOptions = useMemo(
    () => MONTH_NAMES[locale].map((name, index) => ({ value: String(index), label: name })),
    [locale],
  );
  const yearOptions = useMemo(
    () =>
      Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i).map((year) => ({
        value: String(year),
        label: String(year),
      })),
    [],
  );

  const gridDays = useMemo(() => buildGridDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayIso = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  function isDisabledIso(iso: string): boolean {
    return (min != null && iso < min) || (max != null && iso > max);
  }

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function selectDay(iso: string) {
    if (isDisabledIso(iso)) return;
    onChange(iso);
    closePanel();
  }

  function selectToday() {
    if (isDisabledIso(todayIso)) return;
    onChange(todayIso);
    closePanel();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={(event) => {
          if (event.key === "Escape") closePanel();
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm outline-none focus:border-primary disabled:opacity-50"
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value ? formatDisplay(value) : placeholder ?? copy.placeholder}
        </span>
        <span className="text-muted-foreground">{calendarIcon}</span>
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            onKeyDown={(event) => {
              if (event.key === "Escape") closePanel();
            }}
            style={{
              position: "fixed",
              ...(position.direction === "up" ? { bottom: position.bottom } : { top: position.top }),
              left: position.left,
              width: position.width,
            }}
            className="z-200 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="წინა თვე"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                {chevronLeft}
              </button>
              <div className="flex flex-1 gap-1.5">
                <div className="flex-1">
                  <Select
                    ariaLabel={copy.month}
                    options={monthOptions}
                    value={String(viewMonth)}
                    onChange={(next) => setViewMonth(Number(next))}
                  />
                </div>
                <div className="w-24 shrink-0">
                  <Select
                    ariaLabel={copy.year}
                    searchable
                    options={yearOptions}
                    value={String(viewYear)}
                    onChange={(next) => setViewYear(Number(next))}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="შემდეგი თვე"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                {chevronRight}
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAY_NAMES[locale].map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((cell) => {
                const isSelected = cell.iso === value;
                const isToday = cell.iso === todayIso;
                const isDisabled = isDisabledIso(cell.iso);
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => selectDay(cell.iso)}
                    className={`flex aspect-square items-center justify-center rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      isSelected
                        ? "bg-primary font-semibold text-primary-foreground"
                        : cell.inMonth
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground/50 hover:bg-muted"
                    } ${isToday && !isSelected ? "ring-1 ring-inset ring-primary/50" : ""}`}
                  >
                    {cell.d}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2 text-xs font-semibold">
              <button
                type="button"
                onClick={selectToday}
                disabled={isDisabledIso(todayIso)}
                className="text-primary transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.today}
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    closePanel();
                  }}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {copy.clear}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

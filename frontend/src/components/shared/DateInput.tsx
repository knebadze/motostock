"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Locale = "ka" | "en" | "ru";

// A fully custom calendar dropdown, not a styled native <input type="date">
// — the native picker's own popup content (month grid, "today" styling, …)
// can't be restyled via CSS at all, so re-skinning only the closed field
// left the actual dropdown looking like every other site's default browser
// widget. This renders the whole thing itself.
//
// Month/year picking is an in-panel VIEW SWITCH (see `panelView` below), not
// a nested dropdown — an earlier version used two <Select>s here, but a
// Select sized to fit next to the prev/next-month arrows is far too narrow
// for a full month name ("სექტემბერი", "September") and ended up with both
// a horizontal AND a vertical scrollbar inside its own tiny listbox. Tapping
// the month/year label now swaps the WHOLE panel's content for a same-size
// grid where every option's full name is visible at once (months) or a
// vertically-scrollable grid (years — up to 111 of them can't all fit
// without scrolling regardless of layout, but at least never horizontally).
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

const COPY: Record<
  Locale,
  {
    placeholder: string;
    today: string;
    clear: string;
    month: string;
    year: string;
    prevMonth: string;
    nextMonth: string;
    pickMonth: string;
    pickYear: string;
  }
> = {
  ka: {
    placeholder: "აირჩიეთ თარიღი",
    today: "დღეს",
    clear: "გასუფთავება",
    month: "თვე",
    year: "წელი",
    prevMonth: "წინა თვე",
    nextMonth: "შემდეგი თვე",
    pickMonth: "აირჩიეთ თვე",
    pickYear: "აირჩიეთ წელი",
  },
  en: {
    placeholder: "Select date",
    today: "Today",
    clear: "Clear",
    month: "Month",
    year: "Year",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    pickMonth: "Select month",
    pickYear: "Select year",
  },
  ru: {
    placeholder: "Выберите дату",
    today: "Сегодня",
    clear: "Очистить",
    month: "Месяц",
    year: "Год",
    prevMonth: "Предыдущий месяц",
    nextMonth: "Следующий месяц",
    pickMonth: "Выберите месяц",
    pickYear: "Выберите год",
  },
};

const PANEL_WIDTH_PX = 288;
const ESTIMATED_PANEL_HEIGHT_PX = 372;
const CURRENT_YEAR = new Date().getFullYear();
// The outer fallback span when a caller passes no min/max — generous enough
// for every real use of this field (100 years back for date-of-birth, 10
// years forward for scheduling a discount/promo far out). A caller that DOES
// pass min/max (e.g. a date-of-birth field capped at today) gets that
// narrower range instead — see effectiveYearMin/effectiveYearMax below.
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

type PanelView = "days" | "months" | "years";

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
  // ISO "YYYY-MM-DD" bounds — out-of-range days render disabled in the grid,
  // AND (see clampView below) the year/month pickers and prev/next-month
  // buttons are constrained to never navigate somewhere entirely out of
  // range in the first place — a date-of-birth field capped at today
  // shouldn't let you browse into 2030 just to find every day disabled once
  // you get there.
  min?: string;
  max?: string;
  ariaLabel?: string;
  locale?: Locale;
}) {
  const copy = COPY[locale];
  const [open, setOpen] = useState(false);
  const [panelView, setPanelView] = useState<PanelView>("days");
  const [viewYear, setViewYear] = useState(CURRENT_YEAR);
  const [viewMonth, setViewMonth] = useState(0);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedYearButtonRef = useRef<HTMLButtonElement>(null);

  // Pulls (y, m) back inside [min, max] (whichever of those two props are
  // actually set) — used everywhere the visible month can change (opening
  // the panel, the prev/next buttons, and picking a month/year) so none of
  // those paths can land the view on a month with no selectable day at all.
  function clampView(y: number, m: number): { y: number; m: number } {
    if (max != null) {
      const bound = parseIso(max)!;
      if (y > bound.y || (y === bound.y && m > bound.m)) return { y: bound.y, m: bound.m };
    }
    if (min != null) {
      const bound = parseIso(min)!;
      if (y < bound.y || (y === bound.y && m < bound.m)) return { y: bound.y, m: bound.m };
    }
    return { y, m };
  }

  function openPanel() {
    const parsed = parseIso(value);
    const now = new Date();
    const clamped = clampView(parsed?.y ?? now.getFullYear(), parsed?.m ?? now.getMonth());
    setViewYear(clamped.y);
    setViewMonth(clamped.m);
    setPanelView("days");
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

  // Narrowed to whichever of min/max's own year is tighter than the generous
  // default span — a date-of-birth field capped at today has no business
  // offering 2030 in this grid just because some other, uncapped caller
  // (service/discount/order dates) needs the full range.
  const effectiveYearMin = min != null ? Math.max(YEAR_MIN, parseIso(min)!.y) : YEAR_MIN;
  const effectiveYearMax = max != null ? Math.min(YEAR_MAX, parseIso(max)!.y) : YEAR_MAX;
  const years = useMemo(
    () => Array.from({ length: effectiveYearMax - effectiveYearMin + 1 }, (_, i) => effectiveYearMax - i),
    [effectiveYearMin, effectiveYearMax],
  );

  // Scrolls the currently-viewed year into the middle of the grid the moment
  // it opens — with up to 111 entries, landing on the one already selected
  // beats always starting scrolled to the newest (or oldest) end of the list.
  useEffect(() => {
    if (open && panelView === "years") {
      selectedYearButtonRef.current?.scrollIntoView({ block: "center" });
    }
  }, [open, panelView]);

  const gridDays = useMemo(() => buildGridDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const todayIso = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  function isDisabledIso(iso: string): boolean {
    return (min != null && iso < min) || (max != null && iso > max);
  }

  // A given (year, month) combination is entirely out of [min, max] — used to
  // disable individual cells in the month grid (all 12 always render, in a
  // stable layout; out-of-range ones just aren't pickable) rather than
  // shrinking the grid itself.
  function isMonthOutOfRange(y: number, m: number): boolean {
    if (max != null) {
      const bound = parseIso(max)!;
      if (y > bound.y || (y === bound.y && m > bound.m)) return true;
    }
    if (min != null) {
      const bound = parseIso(min)!;
      if (y < bound.y || (y === bound.y && m < bound.m)) return true;
    }
    return false;
  }

  // Disables the prev/next buttons once the view is already sitting on the
  // exact boundary month — clicking again would just clamp back to the same
  // place, so there's nothing left for that direction to do.
  const atMaxBound = max != null && (() => {
    const bound = parseIso(max)!;
    return viewYear === bound.y && viewMonth === bound.m;
  })();
  const atMinBound = min != null && (() => {
    const bound = parseIso(min)!;
    return viewYear === bound.y && viewMonth === bound.m;
  })();

  function changeMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    const clamped = clampView(next.getFullYear(), next.getMonth());
    setViewYear(clamped.y);
    setViewMonth(clamped.m);
  }

  function pickMonth(index: number) {
    if (isMonthOutOfRange(viewYear, index)) return;
    const clamped = clampView(viewYear, index);
    setViewYear(clamped.y);
    setViewMonth(clamped.m);
    setPanelView("days");
  }

  function pickYear(year: number) {
    const clamped = clampView(year, viewMonth);
    setViewYear(clamped.y);
    setViewMonth(clamped.m);
    setPanelView("days");
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

  function handlePanelKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Escape") return;
    // Back out of the month/year picker first, matching common date-picker
    // convention — only closes the whole calendar once already on the day
    // grid.
    if (panelView !== "days") {
      setPanelView("days");
    } else {
      closePanel();
    }
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
            onKeyDown={handlePanelKeyDown}
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
                disabled={atMinBound || panelView !== "days"}
                aria-label={copy.prevMonth}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                {chevronLeft}
              </button>
              <button
                type="button"
                onClick={() => setPanelView(panelView === "months" ? "days" : "months")}
                aria-haspopup="true"
                aria-expanded={panelView === "months"}
                aria-label={copy.pickMonth}
                className="flex-1 truncate rounded-lg px-2 py-1 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {MONTH_NAMES[locale][viewMonth]}
              </button>
              <button
                type="button"
                onClick={() => setPanelView(panelView === "years" ? "days" : "years")}
                aria-haspopup="true"
                aria-expanded={panelView === "years"}
                aria-label={copy.pickYear}
                className="rounded-lg px-2 py-1 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {viewYear}
              </button>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                disabled={atMaxBound || panelView !== "days"}
                aria-label={copy.nextMonth}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                {chevronRight}
              </button>
            </div>

            {panelView === "days" && (
              <>
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
                    className="text-primary-text transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-40"
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
                      className="text-muted-foreground transition-colors hover:text-primary-text"
                    >
                      {copy.clear}
                    </button>
                  )}
                </div>
              </>
            )}

            {panelView === "months" && (
              // 2 columns, not a cramped single Select — every full month
              // name (up to "სექტემბერი"/"September") fits with room to
              // spare, and all 12 are visible at once with no scrolling at
              // all, unlike the old inline dropdown.
              <div className="grid grid-cols-2 gap-1.5">
                {MONTH_NAMES[locale].map((name, index) => {
                  const isSelected = index === viewMonth;
                  const isDisabled = isMonthOutOfRange(viewYear, index);
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => pickMonth(index)}
                      className={`truncate rounded-lg px-2 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                        isSelected
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}

            {panelView === "years" && (
              // 4 columns, vertically scrollable (capped to roughly the same
              // height the day grid occupies) — a 111-year span can't all be
              // on screen at once no matter the layout, but this never
              // scrolls sideways, and opens already centered on the current
              // selection (see the scrollIntoView effect above).
              <div className="grid max-h-64 grid-cols-4 gap-1.5 overflow-y-auto">
                {years.map((year) => {
                  const isSelected = year === viewYear;
                  return (
                    <button
                      key={year}
                      ref={isSelected ? selectedYearButtonRef : undefined}
                      type="button"
                      onClick={() => pickYear(year)}
                      className={`rounded-lg px-2 py-2 text-sm transition-colors ${
                        isSelected
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

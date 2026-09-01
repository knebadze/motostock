"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string };

type BaseProps = {
  options: SelectOption[];
  searchable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  // Forwarded to the trigger button — lets a caller's own <label htmlFor={id}>
  // actually associate with this control (clicking/screen-reader-focusing
  // the label then focuses the button, same as it would a native input).
  // Without this, the button had no stable id a caller could ever target.
  id?: string;
  // For the cases with no visible <label> element at all (e.g. an inline
  // toolbar "sort by" control where the placeholder text is the only visual
  // cue) — gives the button an accessible name some other way. Prefer
  // id/htmlFor when a visible label exists; this is the fallback when one
  // doesn't.
  ariaLabel?: string;
  // Georgian defaults below match the admin panel's (deliberately
  // untranslated) copy — storefront callers pass next-intl-translated
  // overrides so EN/RU visitors don't see Georgian leak through.
  // clearLabel only ever renders when `multiple` is true (see the "×" button
  // below) — no storefront caller uses `multiple` yet, so this default is
  // currently unreachable there. The first storefront multi-select MUST
  // pass a translated clearLabel (e.g. tCommon("select.clear")), the same
  // way every other storefront Select call already overrides placeholder/
  // searchPlaceholder/emptyLabel.
  clearLabel?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
};

type SingleSelectProps = BaseProps & {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
};

type MultiSelectProps = BaseProps & {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
};

export type SelectProps = SingleSelectProps | MultiSelectProps;

type PanelPosition = { left: number; width: number; maxHeight: number } & (
  | { direction: "down"; top: number }
  | { direction: "up"; bottom: number }
);

// Below this much room, downward is considered too cramped to bother with —
// flips upward instead, provided there's actually more room up there. A
// laptop screen or a Select opened near the bottom of a Modal both commonly
// leave less than this below the trigger.
const MIN_DOWNWARD_SPACE_PX = 150;
const MAX_PANEL_HEIGHT_PX = 288;

// How long a run of typed characters counts as one typeahead search before
// resetting — same idea (and roughly the same window) as a native <select>.
const TYPEAHEAD_RESET_MS = 500;

function filterOptions(allOptions: SelectOption[], query: string): SelectOption[] {
  return query
    ? allOptions.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : allOptions;
}

export function Select(props: SelectProps) {
  const {
    options,
    searchable = false,
    placeholder = "აირჩიეთ",
    disabled,
    id,
    ariaLabel,
    clearLabel = "გაწმენდა",
    searchPlaceholder = "ძებნა...",
    emptyLabel = "არაფერი მოიძებნა",
  } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<PanelPosition | null>(null);
  // Index into filteredOptions of the keyboard/mouse-highlighted option —
  // real DOM focus never leaves the trigger button (or the search input,
  // once one is mounted), so this is tracked separately and exposed via
  // aria-activedescendant, the standard pattern for a collapsible listbox
  // button (see the ARIA APG "Collapsible Dropdown Listbox" example).
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const typeaheadRef = useRef<{ text: string; timer: ReturnType<typeof setTimeout> | null }>({
    text: "",
    timer: null,
  });
  const baseId = useId();

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setQuery("");
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Render the dropdown in a portal positioned by viewport coordinates
  // instead of nesting it inside the trigger — otherwise it gets clipped by
  // any scrollable ancestor with overflow set (e.g. a Modal's content area),
  // which made it unreachable/unscrollable when opened near the bottom.
  //
  // Flips upward when there isn't enough room below (a laptop-height
  // viewport, or a Select opened near a Modal's bottom edge) and there's
  // more room above than below — same direction-choosing heuristic a native
  // <select> uses. When flipping up, position is anchored via CSS `bottom`
  // (distance from the viewport's bottom edge up to just above the
  // trigger) rather than computing a `top` from an assumed height: `bottom`
  // anchoring lets the box grow upward to fit its actual content with no
  // measurement needed, which is what an earlier `top`-based attempt at
  // this got wrong — sizing from a fixed reserved height that didn't match
  // the real (often shorter) content height left a visible gap between the
  // panel and the trigger.
  useLayoutEffect(() => {
    // No need to clear position here — the portal render below already
    // gates on `open && position`, so a stale leftover value from the
    // previous time the panel was open is harmless and gets recomputed by
    // updatePosition() below before anything repaints.
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
      const left = Math.min(rect.left, Math.max(8, viewportWidth - rect.width - 8));

      const openUpward = spaceBelow < MIN_DOWNWARD_SPACE_PX && spaceAbove > spaceBelow;

      if (openUpward) {
        setPosition({
          direction: "up",
          bottom: viewportHeight - rect.top + gap,
          left,
          width: rect.width,
          // Never exceed the real space left above the trigger — same
          // "let the internal list scroll past this" reasoning as the
          // downward case (see the <ul> below).
          maxHeight: Math.max(24, Math.min(MAX_PANEL_HEIGHT_PX, spaceAbove)),
        });
      } else {
        setPosition({
          direction: "down",
          top: rect.bottom + gap,
          left,
          width: rect.width,
          maxHeight: Math.max(24, Math.min(MAX_PANEL_HEIGHT_PX, spaceBelow)),
        });
      }
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const filteredOptions = filterOptions(options, query);

  const selectedValues = props.multiple ? props.value : props.value ? [props.value] : [];
  const selectedOptions = options.filter((option) =>
    selectedValues.includes(option.value),
  );

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function toggleOption(optionValue: string) {
    if (props.multiple) {
      const next = props.value.includes(optionValue)
        ? props.value.filter((value) => value !== optionValue)
        : [...props.value, optionValue];
      props.onChange(next);
    } else {
      props.onChange(optionValue);
      setOpen(false);
      setQuery("");
    }
  }

  function removeTag(optionValue: string, event: React.MouseEvent) {
    event.stopPropagation();
    if (props.multiple) {
      props.onChange(props.value.filter((value) => value !== optionValue));
    }
  }

  function closePanel() {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  // Highlight the current selection (or the top of the list) the moment the
  // panel opens, computed here rather than reactively via an effect — an
  // arrow key press should move relative to something meaningful right
  // away, and setting it at the same event that opens the panel avoids an
  // extra render pass just to synchronize state React already knows.
  function openPanel() {
    setOpen(true);
    const selectedIndex = options.findIndex((option) => selectedValues.includes(option.value));
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : options.length > 0 ? 0 : -1);
  }

  function togglePanel() {
    if (open) {
      setOpen(false);
      setQuery("");
    } else {
      openPanel();
    }
  }

  function moveActive(delta: number) {
    setActiveIndex((current) => {
      if (filteredOptions.length === 0) return -1;
      return (current + delta + filteredOptions.length) % filteredOptions.length;
    });
  }

  function handleTypeahead(event: React.KeyboardEvent) {
    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();

    const state = typeaheadRef.current;
    if (state.timer) clearTimeout(state.timer);
    state.text += event.key.toLowerCase();
    state.timer = setTimeout(() => {
      state.text = "";
    }, TYPEAHEAD_RESET_MS);

    const startAt = activeIndex >= 0 ? activeIndex + 1 : 0;
    const search = (from: number, needle: string) => {
      for (let offset = 0; offset < filteredOptions.length; offset++) {
        const index = (from + offset) % filteredOptions.length;
        if (filteredOptions[index].label.toLowerCase().startsWith(needle)) return index;
      }
      return -1;
    };

    // Full accumulated buffer first (e.g. "mo" -> "Motorcycle"); if nothing
    // matches, fall back to just the latest character so repeated presses of
    // the same key still cycle through same-letter options, like a native
    // <select>'s typeahead does.
    let match = search(startAt, state.text);
    if (match === -1 && state.text.length > 1) {
      match = search(startAt, event.key.toLowerCase());
    }
    if (match !== -1) setActiveIndex(match);
  }

  // Shared between the trigger button (non-searchable case, where it keeps
  // real focus the whole time the panel is open) and the search input (the
  // searchable case, where autoFocus below moves real focus there instead)
  // — whichever one currently has focus is the one that'll actually receive
  // these events, so both are wired to the same handler.
  function handleOpenPanelKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActive(-1);
        break;
      case "Home":
        event.preventDefault();
        if (filteredOptions.length > 0) setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        if (filteredOptions.length > 0) setActiveIndex(filteredOptions.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          toggleOption(filteredOptions[activeIndex].value);
        }
        break;
      case "Escape":
        event.preventDefault();
        closePanel();
        break;
      case "Tab":
        // No preventDefault — Tab should still move focus onward normally,
        // just without leaving the panel open behind it.
        setOpen(false);
        setQuery("");
        break;
      default:
        // Typing into the search input already filters via its own
        // onChange — only hijack keystrokes for typeahead when there's no
        // search box to type into.
        if (!searchable) handleTypeahead(event);
    }
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openPanel();
      }
      return;
    }
    handleOpenPanelKeyDown(event);
  }

  const activeOptionId =
    activeIndex >= 0 && filteredOptions[activeIndex] ? `${baseId}-option-${activeIndex}` : undefined;
  const listboxId = `${baseId}-listbox`;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={togglePanel}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && !searchable ? activeOptionId : undefined}
        className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm outline-none focus:border-primary disabled:opacity-50"
      >
        {selectedOptions.length === 0 && (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {props.multiple
          ? selectedOptions.map((option) => (
              <span
                key={option.value}
                className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {option.label}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(event) => removeTag(option.value, event)}
                  className="cursor-pointer text-primary/70 hover:text-primary"
                >
                  ×
                </span>
              </span>
            ))
          : selectedOptions[0] && <span>{selectedOptions[0].label}</span>}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              ...(position.direction === "up" ? { bottom: position.bottom } : { top: position.top }),
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className="z-200 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          >
            {props.multiple && selectedOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-2">
                {selectedOptions.map((option) => (
                  <span
                    key={option.value}
                    className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {option.label}
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(event) => removeTag(option.value, event)}
                      className="cursor-pointer text-primary/70 hover:text-primary"
                    >
                      ×
                    </span>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onChange([]);
                  }}
                  className="ml-auto shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {clearLabel}
                </button>
              </div>
            )}
            {searchable && (
              <div className="shrink-0 border-b border-border p-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setQuery(nextQuery);
                    // Jump the highlight to the top match, same reasoning
                    // as openPanel() above — computed at the event that
                    // changes the filtered set, not via a reactive effect.
                    const nextFiltered = filterOptions(options, nextQuery);
                    setActiveIndex(nextFiltered.length > 0 ? 0 : -1);
                  }}
                  onKeyDown={handleOpenPanelKeyDown}
                  placeholder={searchPlaceholder}
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={listboxId}
                  aria-activedescendant={activeOptionId}
                  autoComplete="off"
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
              </div>
            )}
            <ul id={listboxId} role="listbox" className="flex-1 overflow-y-auto py-1">
              {filteredOptions.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyLabel}
                </li>
              )}
              {filteredOptions.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const isActive = index === activeIndex;
                return (
                  <li key={option.value} ref={(el) => { optionRefs.current[index] = el; }}>
                    <button
                      id={`${baseId}-option-${index}`}
                      type="button"
                      tabIndex={-1}
                      onClick={() => toggleOption(option.value)}
                      onMouseEnter={() => setActiveIndex(index)}
                      role="option"
                      aria-selected={isSelected}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-muted hover:text-primary ${
                        isActive ? "bg-muted" : ""
                      } ${isSelected ? "text-primary" : "text-foreground"}`}
                    >
                      {option.label}
                      {isSelected && <span>✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

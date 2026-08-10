"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string };

type BaseProps = {
  options: SelectOption[];
  searchable?: boolean;
  placeholder?: string;
  disabled?: boolean;
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

type PanelPosition = { top: number; left: number; width: number; maxHeight: number };

export function Select(props: SelectProps) {
  const { options, searchable = false, placeholder = "აირჩიეთ", disabled } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
  // Always opens downward (even past the modal's own edge, since the portal
  // already floats above it) — flipping upward left a gap whenever the list
  // was shorter than the reserved space, landing far above the trigger.
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
      // Never exceed the real space left below the trigger — a taller
      // panel would extend past the viewport, where it's unreachable (a
      // position:fixed element doesn't scroll with the page). The list
      // itself scrolls internally (see the <ul> below) once it's taller
      // than whatever height actually fits.
      const maxHeight = Math.max(24, Math.min(288, spaceBelow));
      const left = Math.min(rect.left, Math.max(8, viewportWidth - rect.width - 8));

      setPosition({
        top: rect.bottom + gap,
        left,
        width: rect.width,
        maxHeight,
      });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const filteredOptions = query
    ? options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  const selectedValues = props.multiple ? props.value : props.value ? [props.value] : [];
  const selectedOptions = options.filter((option) =>
    selectedValues.includes(option.value),
  );

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
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
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className="z-200 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          >
            {searchable && (
              <div className="shrink-0 border-b border-border p-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ძებნა..."
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                />
              </div>
            )}
            <ul role="listbox" className="flex-1 overflow-y-auto py-1">
              {filteredOptions.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  არაფერი მოიძებნა
                </li>
              )}
              {filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      role="option"
                      aria-selected={isSelected}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-muted hover:text-primary ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
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

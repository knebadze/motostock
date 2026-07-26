"use client";

import { useEffect, useRef, useState } from "react";

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

export function Select(props: SelectProps) {
  const { options, searchable = false, placeholder = "აირჩიეთ", disabled } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {searchable && (
            <div className="border-b border-border p-2">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ძებნა..."
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
            </div>
          )}
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
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
        </div>
      )}
    </div>
  );
}

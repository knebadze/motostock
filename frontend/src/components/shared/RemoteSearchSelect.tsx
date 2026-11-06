"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Select, type SelectOption } from "./Select";

// A searchable Select whose options come from the server, one search at a
// time — for pickers over lists too large to embed in the page (the whole
// product catalog, ~3,500 vehicle catalog entries). `search("")` is called
// on mount and whenever the box is cleared, so an empty box still shows a
// first page. The chosen option stays visible as the selection even after
// a later search no longer returns it.
const SEARCH_DEBOUNCE_MS = 250;

export function RemoteSearchSelect({
  value,
  onChange,
  search,
  placeholder,
  ariaLabel,
  disabled,
}: {
  value: string;
  onChange: (value: string, option: SelectOption | null) => void;
  search: (query: string) => Promise<SelectOption[]>;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [selected, setSelected] = useState<SelectOption | null>(null);
  const [loading, setLoading] = useState(false);
  // Only the latest request may set the options (an earlier, slower
  // response must not overwrite a newer one).
  const requestRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const runSearch = useCallback((query: string) => {
    const request = ++requestRef.current;
    setLoading(true);
    searchRef
      .current(query)
      .then((items) => {
        if (request === requestRef.current) setOptions(items);
      })
      .catch(() => {
        if (request === requestRef.current) setOptions([]);
      })
      .finally(() => {
        if (request === requestRef.current) setLoading(false);
      });
  }, []);

  // First page on mount (scheduled, not run inline — runSearch sets state).
  useEffect(() => {
    timerRef.current = setTimeout(() => runSearch(""), 0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [runSearch]);

  const handleSearchChange = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => runSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    },
    [runSearch],
  );

  const selectedOption = value && selected?.value === value ? selected : null;
  const shownOptions =
    selectedOption && !options.some((option) => option.value === selectedOption.value)
      ? [selectedOption, ...options]
      : options;

  return (
    <Select
      options={shownOptions}
      value={value}
      onChange={(next) => {
        const option = shownOptions.find((item) => item.value === next) ?? null;
        setSelected(option);
        onChange(next, option);
      }}
      searchable
      onSearchChange={handleSearchChange}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      disabled={disabled}
      emptyLabel={loading ? "იძებნება..." : "არაფერი მოიძებნა"}
    />
  );
}

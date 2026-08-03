"use client";

import { useState } from "react";
import { Select } from "@/components/shared/Select";
import { Loader } from "@/components/shared/Loader";
import type { AdminFilterEntry } from "@/lib/api/admin-filters";

export type { AdminFilterEntry };
export type AdminFilterKind = "RANGE" | "MULTI_SELECT" | "BOOLEAN" | "TEXT";
export type AdminFilterOption = { value: string; label: string };
export type AdminFilterField = {
  key: string;
  label: string;
  section: string;
  kind: AdminFilterKind;
  options?: AdminFilterOption[];
};

type FieldState = {
  optionValues: string[];
  booleanEnabled: boolean;
  rangeMin: string;
  rangeMax: string;
  text: string;
};
const EMPTY_STATE: FieldState = {
  optionValues: [],
  booleanEnabled: false,
  rangeMin: "",
  rangeMax: "",
  text: "",
};

function toEntryValue(field: AdminFilterField, state: FieldState): unknown {
  if (field.kind === "MULTI_SELECT" && state.optionValues.length > 0) {
    return state.optionValues.map((value) => (Number.isNaN(Number(value)) ? value : Number(value)));
  }
  if (field.kind === "BOOLEAN" && state.booleanEnabled) return true;
  if (field.kind === "RANGE" && (state.rangeMin.trim() || state.rangeMax.trim())) {
    return {
      min: state.rangeMin.trim() ? Number(state.rangeMin) : undefined,
      max: state.rangeMax.trim() ? Number(state.rangeMax) : undefined,
    };
  }
  if (field.kind === "TEXT" && state.text.trim()) return state.text.trim();
  return undefined;
}

function toEntries(fields: AdminFilterField[], state: Record<string, FieldState>): AdminFilterEntry[] {
  const entries: AdminFilterEntry[] = [];
  for (const field of fields) {
    const fieldState = state[field.key];
    if (!fieldState) continue;
    const value = toEntryValue(field, fieldState);
    if (value !== undefined) entries.push({ key: field.key, value });
  }
  return entries;
}

// Generic "filter everything" admin panel — driven entirely by a per-domain
// `fields` descriptor list (see frontend/src/config/admin-filters/), so
// adding a filterable field anywhere is a one-line descriptor change, not a
// new component. All fields sit in one collapsible panel, grouped visually
// by section; nothing is requested until "გაფილტვრა" is pressed — typing
// into a text/range field never fires a request on its own.
export function AdminFilterPanel({
  fields,
  onChange,
}: {
  fields: AdminFilterField[];
  // May return a Promise (the Manager's fetch) — awaited here so the button
  // can show a spinner and stay disabled for the request's whole duration,
  // not just the instant the click handler runs.
  onChange: (entries: AdminFilterEntry[]) => void | Promise<void>;
}) {
  const [state, setState] = useState<Record<string, FieldState>>({});
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  function updateField(key: string, patch: Partial<FieldState>) {
    setState((current) => ({ ...current, [key]: { ...(current[key] ?? EMPTY_STATE), ...patch } }));
  }

  async function handleApply() {
    setApplying(true);
    try {
      await onChange(toEntries(fields, state));
    } finally {
      setApplying(false);
    }
  }

  async function handleClear() {
    setState({});
    setApplying(true);
    try {
      await onChange([]);
    } finally {
      setApplying(false);
    }
  }

  const sections = Array.from(new Set(fields.map((field) => field.section)));
  const hasActiveValues = Object.values(state).some(
    (fieldState) =>
      fieldState.optionValues.length > 0 ||
      fieldState.booleanEnabled ||
      fieldState.rangeMin.trim() !== "" ||
      fieldState.rangeMax.trim() !== "" ||
      fieldState.text.trim() !== "",
  );

  if (fields.length === 0) return null;

  return (
    <details
      className="rounded-2xl border border-border bg-card p-4"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        ფილტრი
        {hasActiveValues && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium normal-case text-primary">
            აქტიური
          </span>
        )}
      </summary>

      <div className="mt-4 flex flex-col gap-5">
        {sections.map((section) => (
          <div key={section} className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section}
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fields
                .filter((field) => field.section === section)
                .map((field) => {
                  const fieldState = state[field.key] ?? EMPTY_STATE;

                  if (field.kind === "TEXT") {
                    return (
                      <div key={field.key} className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">{field.label}</label>
                        <input
                          value={fieldState.text}
                          onChange={(event) => updateField(field.key, { text: event.target.value })}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    );
                  }

                  if (field.kind === "RANGE") {
                    return (
                      <div key={field.key} className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">{field.label}</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={fieldState.rangeMin}
                            onChange={(event) =>
                              updateField(field.key, { rangeMin: event.target.value })
                            }
                            placeholder="დან"
                            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                          />
                          <input
                            type="number"
                            value={fieldState.rangeMax}
                            onChange={(event) =>
                              updateField(field.key, { rangeMax: event.target.value })
                            }
                            placeholder="მდე"
                            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (field.kind === "BOOLEAN") {
                    return (
                      <label key={field.key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={fieldState.booleanEnabled}
                          onChange={(event) =>
                            updateField(field.key, { booleanEnabled: event.target.checked })
                          }
                          className="size-4 rounded border-border accent-primary"
                        />
                        {field.label}
                      </label>
                    );
                  }

                  return (
                    <div key={field.key} className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">{field.label}</label>
                      <Select
                        multiple
                        searchable
                        options={field.options ?? []}
                        value={fieldState.optionValues}
                        onChange={(optionValues) => updateField(field.key, { optionValues })}
                        placeholder="აირჩიეთ"
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          {hasActiveValues && (
            <button
              type="button"
              onClick={handleClear}
              disabled={applying}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              გაწმენდა
            </button>
          )}
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {applying && <Loader size="xs" />}
            გაფილტვრა
          </button>
        </div>
      </div>
    </details>
  );
}

"use client";

import { FieldError } from "./FieldError";

export type LocalizedNameValue = { ka: string; en: string; ru: string };
export type LocalizedNameErrors = { ka?: string; en?: string; ru?: string };

export function LocalizedNameFields({
  idPrefix,
  value,
  onChange,
  onEnglishChange,
  errors,
}: {
  idPrefix: string;
  value: LocalizedNameValue;
  onChange: (value: LocalizedNameValue) => void;
  onEnglishChange?: (value: string) => void;
  errors?: LocalizedNameErrors;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-ka`} className="text-sm font-medium">
          სახელი (ქართულად) *
        </label>
        <input
          id={`${idPrefix}-ka`}
          value={value.ka}
          onChange={(event) => onChange({ ...value, ka: event.target.value })}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <FieldError message={errors?.ka} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-en`} className="text-sm font-medium">
          სახელი (ინგლისურად) *
        </label>
        <input
          id={`${idPrefix}-en`}
          value={value.en}
          onChange={(event) => {
            const next = event.target.value;
            onChange({ ...value, en: next });
            onEnglishChange?.(next);
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <FieldError message={errors?.en} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-ru`} className="text-sm font-medium">
          სახელი (რუსულად) *
        </label>
        <input
          id={`${idPrefix}-ru`}
          value={value.ru}
          onChange={(event) => onChange({ ...value, ru: event.target.value })}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <FieldError message={errors?.ru} />
      </div>
    </>
  );
}

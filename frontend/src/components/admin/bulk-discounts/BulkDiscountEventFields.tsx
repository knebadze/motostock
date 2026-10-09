"use client";

import { useState } from "react";
import { Toggle } from "@/components/shared/Toggle";
import { useFileUploadPreview } from "@/components/shared/useFileUploadPreview";
import type { LocalizedString } from "@/lib/api/categories";

type LocaleKey = keyof LocalizedString;

const EMPTY_LOCALIZED: LocalizedString = { ka: "", en: "", ru: "" };

const LOCALE_LABELS: Record<LocaleKey, string> = {
  ka: "ქართულად",
  en: "ინგლისურად",
  ru: "რუსულად",
};

const INPUT_CLASS =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

// The optional "save this batch as a named, repeatable event" draft —
// opt-in, off by default; off means the apply request carries no `event`
// at all and each selected item just gets its own independent discount,
// exactly as before event-grouping existed.
export function useBulkDiscountEventDraft() {
  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState<LocalizedString>(EMPTY_LOCALIZED);
  const [description, setDescription] = useState<LocalizedString>(EMPTY_LOCALIZED);
  const image = useFileUploadPreview(null);

  function reset() {
    setEnabled(false);
    setName(EMPTY_LOCALIZED);
    setDescription(EMPTY_LOCALIZED);
    image.reset(null);
  }

  const nameComplete = Boolean(name.ka.trim() && name.en.trim() && name.ru.trim());

  // The `event` field of applyBulkDiscounts' input — undefined when off.
  function toEventInput() {
    if (!enabled) return undefined;
    return {
      nameKa: name.ka.trim(),
      nameEn: name.en.trim(),
      nameRu: name.ru.trim(),
      descriptionKa: description.ka.trim() || undefined,
      descriptionEn: description.en.trim() || undefined,
      descriptionRu: description.ru.trim() || undefined,
    };
  }

  return {
    enabled,
    setEnabled,
    name,
    setName,
    description,
    setDescription,
    image,
    nameComplete,
    reset,
    toEventInput,
  };
}

export type BulkDiscountEventDraft = ReturnType<typeof useBulkDiscountEventDraft>;

export function BulkDiscountEventFields({
  draft,
  separateItemsLabel,
}: {
  draft: BulkDiscountEventDraft;
  // e.g. "თითოეულ ვარიანტს" — completes the "off means…" hint below.
  separateItemsLabel: string;
}) {
  const locales = Object.keys(LOCALE_LABELS) as LocaleKey[];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex w-fit items-center gap-3 text-sm font-medium">
        <Toggle checked={draft.enabled} onChange={draft.setEnabled} label="შექმენი ივენთად" />
        შექმენი ივენთად
      </div>
      <p className="text-xs text-muted-foreground">
        არასავალდებულოა — ჩართეთ, თუ გსურთ ამ ფასდაკლების ერთიან, დასახელებულ ივენთად შენახვა
        (მოგვიანებით გამეორებადი). გამორთულის შემთხვევაში ფასდაკლება დაემატება ზუსტად ისე, როგორც
        აქამდე — {separateItemsLabel} ცალკე, ერთმანეთისგან დამოუკიდებლად.
      </p>

      {draft.enabled && (
        <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {locales.map((locale) => (
              <div key={`name-${locale}`} className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">სახელი ({LOCALE_LABELS[locale]}) *</label>
                <input
                  type="text"
                  value={draft.name[locale]}
                  onChange={(event) => draft.setName((current) => ({ ...current, [locale]: event.target.value }))}
                  className={INPUT_CLASS}
                />
              </div>
            ))}
            {locales.map((locale) => (
              <div key={`description-${locale}`} className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">აღწერა ({LOCALE_LABELS[locale]})</label>
                <textarea
                  value={draft.description[locale]}
                  onChange={(event) =>
                    draft.setDescription((current) => ({ ...current, [locale]: event.target.value }))
                  }
                  rows={2}
                  className={INPUT_CLASS}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">სურათი</label>
            <p className="text-xs text-muted-foreground">
              რეკომენდებული ზომა: 1920×800px (თანაფარდობა ~21:9), მაქს. 5MB, ფორმატი: jpg/png/webp.
            </p>
            {draft.image.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.image.previewUrl}
                alt=""
                className="h-32 w-full max-w-xs rounded-lg border border-border object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={draft.image.onChange}
              className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
            />
          </div>
        </div>
      )}
    </div>
  );
}

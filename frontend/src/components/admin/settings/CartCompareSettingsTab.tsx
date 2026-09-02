"use client";

import { useState } from "react";
import type { Settings } from "@/lib/api/settings";

type CartCompareDraft = Pick<Settings, "cartMaxQuantity" | "compareMaxItems">;

function draftFrom(settings: Settings): CartCompareDraft {
  return {
    cartMaxQuantity: settings.cartMaxQuantity,
    compareMaxItems: settings.compareMaxItems,
  };
}

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function CartCompareSettingsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CartCompareDraft>(draftFrom(settings));

  return (
    <div className="rounded-2xl border border-border p-5">
      <p className="font-medium text-foreground">კალათა და შედარება</p>
      <p className="mt-1 text-sm text-muted-foreground">
        რაოდენობის ჭერები კალათასა და შედარების სიაში.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">მაქს. რაოდენობა ერთ ნივთზე კალათაში</label>
          <input
            type="number"
            min={1}
            value={draft.cartMaxQuantity}
            onChange={(event) =>
              setDraft((current) => ({ ...current, cartMaxQuantity: Number(event.target.value) }))
            }
            className={inputClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">მაქს. ნივთი შედარების სიაში</label>
          <input
            type="number"
            min={1}
            value={draft.compareMaxItems}
            onChange={(event) =>
              setDraft((current) => ({ ...current, compareMaxItems: Number(event.target.value) }))
            }
            className={inputClassName}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSave({ ...settings, ...draft })}
        disabled={saving}
        className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        შენახვა
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Settings } from "@/lib/api/settings";

type FinaDraft = Pick<Settings, "finaWebCustomerId" | "finaWebUserId">;

function finaDraftFrom(settings: Settings): FinaDraft {
  return {
    finaWebCustomerId: settings.finaWebCustomerId,
    finaWebUserId: settings.finaWebUserId,
  };
}

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function parseNullableInt(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function FinaSettingsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<FinaDraft>(finaDraftFrom(settings));

  return (
    <div className="rounded-2xl border border-border p-5">
      <p className="font-medium text-foreground">FINA-ის ვების გაყიდვების იდენტიფიკატორები</p>
      <p className="mt-1 text-sm text-muted-foreground">
        საიტზე განთავსებული შეკვეთები FINA-ში ჩაიწერება ამ მყიდველისა და მომხმარებლის ანგარიშზე.
        სანამ ორივე ველი ცარიელია, შეკვეთები FINA-ში არ გაიგზავნება — მხოლოდ ლოკალურად
        დამუშავდება.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">FINA მყიდველის (customer) ID</label>
          <input
            type="number"
            min={1}
            value={draft.finaWebCustomerId ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                finaWebCustomerId: parseNullableInt(event.target.value),
              }))
            }
            className={inputClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">FINA მომხმარებლის (user) ID</label>
          <input
            type="number"
            min={1}
            value={draft.finaWebUserId ?? ""}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                finaWebUserId: parseNullableInt(event.target.value),
              }))
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

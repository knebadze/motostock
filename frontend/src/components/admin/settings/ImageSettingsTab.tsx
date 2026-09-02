"use client";

import { useState } from "react";
import type { Settings } from "@/lib/api/settings";

type ImageDraft = Pick<Settings, "imageMaxDimensionPx" | "imageWebpQuality">;

function draftFrom(settings: Settings): ImageDraft {
  return {
    imageMaxDimensionPx: settings.imageMaxDimensionPx,
    imageWebpQuality: settings.imageWebpQuality,
  };
}

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function ImageSettingsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ImageDraft>(draftFrom(settings));

  return (
    <div className="rounded-2xl border border-border p-5">
      <p className="font-medium text-foreground">სურათების დამუშავება</p>
      <p className="mt-1 text-sm text-muted-foreground">
        ატვირთვისას სურათები გარდაიქმნება WebP ფორმატში ამ ზომითა და ხარისხით.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">მაქს. გვერდი პიქსელებში</label>
          <input
            type="number"
            min={100}
            value={draft.imageMaxDimensionPx}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                imageMaxDimensionPx: Number(event.target.value),
              }))
            }
            className={inputClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">WebP ხარისხი (1–100)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={draft.imageWebpQuality}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                imageWebpQuality: Number(event.target.value),
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

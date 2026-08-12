"use client";

import { useState } from "react";
import type { Settings } from "@/lib/api/settings";

type FraudDraft = Pick<
  Settings,
  | "fraudVelocityOrderCount"
  | "fraudVelocityWindowMinutes"
  | "fraudNewAccountWindowHours"
  | "fraudHighValueThreshold"
  | "fraudFailedLoginThreshold"
  | "fraudFailedLoginWindowMinutes"
>;

function fraudDraftFrom(settings: Settings): FraudDraft {
  return {
    fraudVelocityOrderCount: settings.fraudVelocityOrderCount,
    fraudVelocityWindowMinutes: settings.fraudVelocityWindowMinutes,
    fraudNewAccountWindowHours: settings.fraudNewAccountWindowHours,
    fraudHighValueThreshold: settings.fraudHighValueThreshold,
    fraudFailedLoginThreshold: settings.fraudFailedLoginThreshold,
    fraudFailedLoginWindowMinutes: settings.fraudFailedLoginWindowMinutes,
  };
}

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function FraudSettingsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<FraudDraft>(fraudDraftFrom(settings));

  return (
    <div className="rounded-2xl border border-border p-5">
      <p className="font-medium text-foreground">თაღლითობის დეტექციის ბარიერები</p>
      <p className="mt-1 text-sm text-muted-foreground">
        ეს მნიშვნელობები განსაზღვრავს, როდის მიენიჭება შეკვეთას/ანგარიშს რისკის დროშა (მხოლოდ
        ადმინისთვის — არაფერი იბლოკება ავტომატურად).
      </p>

      <div className="mt-4 flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-foreground">შეკვეთების სიხშირე</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">მაქს. შეკვეთა ფანჯარაში</label>
              <input
                type="number"
                min={1}
                value={draft.fraudVelocityOrderCount}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    fraudVelocityOrderCount: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">ფანჯარა (წუთი)</label>
              <input
                type="number"
                min={1}
                value={draft.fraudVelocityWindowMinutes}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    fraudVelocityWindowMinutes: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">ახალი ანგარიში + მაღალი თანხა</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">„ახალი” ანგარიშის ფანჯარა (საათი)</label>
              <input
                type="number"
                min={1}
                value={draft.fraudNewAccountWindowHours}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    fraudNewAccountWindowHours: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">„მაღალი” თანხის ზღვარი (₾)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={draft.fraudHighValueThreshold}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    fraudHighValueThreshold: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">წარუმატებელი login-ები</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">ბარიერი (მცდელობა)</label>
              <input
                type="number"
                min={1}
                value={draft.fraudFailedLoginThreshold}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    fraudFailedLoginThreshold: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">ფანჯარა (წუთი)</label>
              <input
                type="number"
                min={1}
                value={draft.fraudFailedLoginWindowMinutes}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    fraudFailedLoginWindowMinutes: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </div>
          </div>
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

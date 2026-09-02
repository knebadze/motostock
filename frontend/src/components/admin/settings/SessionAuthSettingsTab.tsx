"use client";

import { useState } from "react";
import type { Settings } from "@/lib/api/settings";

type SessionAuthDraft = Pick<
  Settings,
  | "sessionIdleTtlMinutes"
  | "sessionAbsoluteTtlDays"
  | "resetTokenTtlMinutes"
  | "verificationTokenTtlHours"
  | "guestIdCookieMaxAgeDays"
>;

function draftFrom(settings: Settings): SessionAuthDraft {
  return {
    sessionIdleTtlMinutes: settings.sessionIdleTtlMinutes,
    sessionAbsoluteTtlDays: settings.sessionAbsoluteTtlDays,
    resetTokenTtlMinutes: settings.resetTokenTtlMinutes,
    verificationTokenTtlHours: settings.verificationTokenTtlHours,
    guestIdCookieMaxAgeDays: settings.guestIdCookieMaxAgeDays,
  };
}

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function SessionAuthSettingsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SessionAuthDraft>(draftFrom(settings));

  function field<K extends keyof SessionAuthDraft>(key: K, label: string) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{label}</label>
        <input
          type="number"
          min={1}
          value={draft[key]}
          onChange={(event) =>
            setDraft((current) => ({ ...current, [key]: Number(event.target.value) }))
          }
          className={inputClassName}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border p-5">
      <p className="font-medium text-foreground">სესია და ავტორიზაცია</p>
      <p className="mt-1 text-sm text-muted-foreground">
        login-სესიის და დროებითი ბმულების/კუკის ვადები.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field("sessionIdleTtlMinutes", "სესიის უქმობის ვადა (წუთი)")}
        {field("sessionAbsoluteTtlDays", "სესიის მაქს. ხანგრძლივობა (დღე)")}
        {field("resetTokenTtlMinutes", "პაროლის აღდგენის ბმულის ვადა (წუთი)")}
        {field("verificationTokenTtlHours", "ელფოსტის დადასტურების ბმულის ვადა (საათი)")}
        {field("guestIdCookieMaxAgeDays", "სტუმრის cookie-ის ვადა (დღე)")}
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

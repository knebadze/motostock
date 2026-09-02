"use client";

import { useState } from "react";
import type { Settings } from "@/lib/api/settings";

type AnalyticsDashboardDraft = Pick<
  Settings,
  | "analyticsDefaultWindowDays"
  | "dashboardDemandCandidateLimit"
  | "dashboardRecentCancelledLimit"
  | "dashboardRecentOrdersLimit"
  | "dashboardLowStockLimit"
  | "dashboardRecentActivityWindowDays"
  | "lowStockThreshold"
>;

function draftFrom(settings: Settings): AnalyticsDashboardDraft {
  return {
    analyticsDefaultWindowDays: settings.analyticsDefaultWindowDays,
    dashboardDemandCandidateLimit: settings.dashboardDemandCandidateLimit,
    dashboardRecentCancelledLimit: settings.dashboardRecentCancelledLimit,
    dashboardRecentOrdersLimit: settings.dashboardRecentOrdersLimit,
    dashboardLowStockLimit: settings.dashboardLowStockLimit,
    dashboardRecentActivityWindowDays: settings.dashboardRecentActivityWindowDays,
    lowStockThreshold: settings.lowStockThreshold,
  };
}

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function AnalyticsDashboardSettingsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AnalyticsDashboardDraft>(draftFrom(settings));

  function field<K extends keyof AnalyticsDashboardDraft>(key: K, label: string, min = 1) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{label}</label>
        <input
          type="number"
          min={min}
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
      <p className="font-medium text-foreground">ანალიტიკა და მთავარი დაფა</p>
      <p className="mt-1 text-sm text-muted-foreground">
        დროის ფანჯრები და სიების სიგრძეები, რომლებსაც იყენებს ანალიტიკისა და დაფის გვერდები.
      </p>

      <div className="mt-4 flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-foreground">დროის ფანჯრები</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field("analyticsDefaultWindowDays", "ანალიტიკის ნაგულისხმევი პერიოდი (დღე)")}
            {field(
              "dashboardRecentActivityWindowDays",
              "დაფის ბოლო აქტივობის ფანჯარა (დღე)",
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">დაფის სიების სიგრძეები</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field("dashboardDemandCandidateLimit", "მოთხოვნადი პროდუქტების კანდიდატები")}
            {field("dashboardRecentCancelledLimit", "ბოლო გაუქმებული შეკვეთები")}
            {field("dashboardRecentOrdersLimit", "ბოლო შეკვეთები")}
            {field("dashboardLowStockLimit", "დაბალი მარაგის სია (დაფაზე)")}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">მარაგი</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field("lowStockThreshold", "„დაბალი მარაგის“ ზღვარი (ცალი)", 0)}
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

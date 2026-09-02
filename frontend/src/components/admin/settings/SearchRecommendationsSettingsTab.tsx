"use client";

import { useState } from "react";
import type { Settings } from "@/lib/api/settings";

type SearchRecommendationsDraft = Pick<
  Settings,
  | "searchResultCap"
  | "salesSummaryLimit"
  | "recommendationsDefaultLimit"
  | "recommendationsCacheTtlMinutes"
  | "recommendationOrderWeight"
  | "recommendationWishlistWeight"
  | "recommendationViewWeight"
  | "recentlyViewedLimit"
>;

function draftFrom(settings: Settings): SearchRecommendationsDraft {
  return {
    searchResultCap: settings.searchResultCap,
    salesSummaryLimit: settings.salesSummaryLimit,
    recommendationsDefaultLimit: settings.recommendationsDefaultLimit,
    recommendationsCacheTtlMinutes: settings.recommendationsCacheTtlMinutes,
    recommendationOrderWeight: settings.recommendationOrderWeight,
    recommendationWishlistWeight: settings.recommendationWishlistWeight,
    recommendationViewWeight: settings.recommendationViewWeight,
    recentlyViewedLimit: settings.recentlyViewedLimit,
  };
}

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function SearchRecommendationsSettingsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SearchRecommendationsDraft>(draftFrom(settings));

  function field<K extends keyof SearchRecommendationsDraft>(
    key: K,
    label: string,
    min = 0,
    step?: string,
  ) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{label}</label>
        <input
          type="number"
          min={min}
          step={step}
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
      <p className="font-medium text-foreground">ძიება და რეკომენდაციები</p>
      <p className="mt-1 text-sm text-muted-foreground">
        ძიების შედეგების ჭერები და რეკომენდაციების გამოთვლის პარამეტრები.
      </p>

      <div className="mt-4 flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-foreground">ძიება</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field("searchResultCap", "ძიების შედეგების მაქს. რაოდენობა (შიდა ჭერი)", 1)}
            {field("salesSummaryLimit", "გაყიდვების შეჯამების სია (ტოპ N)", 1)}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">რეკომენდაციები</p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field("recommendationsDefaultLimit", "ნაგულისხმევი რაოდენობა")}
            {field("recommendationsCacheTtlMinutes", "ქეშის ვადა (წუთი)", 1)}
            {field("recommendationOrderWeight", "შეკვეთის წონა", 0, "0.1")}
            {field("recommendationWishlistWeight", "სასურველების წონა", 0, "0.1")}
            {field("recommendationViewWeight", "დათვალიერების წონა", 0, "0.1")}
            {field("recentlyViewedLimit", "„ბოლოს ნანახის“ სია (რაოდენობა)")}
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

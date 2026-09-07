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
    hint?: string,
  ) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{label}</label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
          <div className="mt-2 grid grid-cols-1 gap-3">
            {field(
              "searchResultCap",
              "ძიების შედეგების მაქს. რაოდენობა (შიდა ჭერი)",
              1,
              undefined,
              "რამდენ პროდუქტამდე გამოითვლება რელევანტურობა ერთ საძიებო მოთხოვნაზე — ზოგადი საძიებო სიტყვა კატალოგის დიდ ნაწილს რომ არ ემთხვეოდეს და წარმადობას არ აზარალებდეს.",
            )}
            {field(
              "salesSummaryLimit",
              "გაყიდვების შეჯამების სია (ტოპ N)",
              1,
              undefined,
              "ადმინში პროდუქტის/ტექნიკის დეტალების ფანჯარაში რამდენი ბოლო შეკვეთა გამოჩნდეს გაყიდვების ისტორიაში.",
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">რეკომენდაციები</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            {field(
              "recommendationsDefaultLimit",
              "ნაგულისხმევი რაოდენობა",
              0,
              undefined,
              "რამდენი პროდუქტი დაბრუნდეს რეკომენდაციის სექციებში (მაგ. „თქვენთვის რეკომენდებული“), როცა კონკრეტული რაოდენობა მოთხოვნაში მითითებული არ არის.",
            )}
            {field(
              "recommendationsCacheTtlMinutes",
              "ქეშის ვადა (წუთი)",
              1,
              undefined,
              "რამდენ წუთს ინახება უკვე გამოთვლილი რეკომენდაცია, სანამ თავიდან არ გამოითვლება — მოკლე ვადა უფრო ცხადს ხდის ცვლილებებს, გრძელი ვადა ამცირებს სერვერის დატვირთვას.",
            )}
            {field(
              "recommendationOrderWeight",
              "შეკვეთის წონა",
              0,
              "0.1",
              "„თქვენთვის რეკომენდებული“ სექციისთვის — რამდენად მეტ გავლენას ახდენს მომხმარებლის ნაყიდი კატეგორია/ბრენდი რეკომენდაციაზე. ყველაზე ძლიერი სიგნალია (რეალური შესყიდვა), ამიტომ ჩვეულებრივ ყველაზე მაღალია.",
            )}
            {field(
              "recommendationWishlistWeight",
              "სასურველების წონა",
              0,
              "0.1",
              "იგივე მექანიზმი, სასურველების სიაში დამატებული პროდუქტის კატეგორია/ბრენდისთვის — შუალედური სიგნალია, შესყიდვაზე სუსტი, დათვალიერებაზე ძლიერი.",
            )}
            {field(
              "recommendationViewWeight",
              "დათვალიერების წონა",
              0,
              "0.1",
              "იგივე მექანიზმი, უბრალოდ ნანახი პროდუქტის კატეგორია/ბრენდისთვის — ყველაზე სუსტი სიგნალია, ამიტომ ჩვეულებრივ ყველაზე დაბალია.",
            )}
            {field(
              "recentlyViewedLimit",
              "„ბოლოს ნანახის“ სია (რაოდენობა)",
              0,
              undefined,
              "„ბოლოს ნანახი“ სექციაში მაქსიმუმ რამდენი პროდუქტი გამოჩნდეს მომხმარებლის დათვალიერების ისტორიიდან.",
            )}
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

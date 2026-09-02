"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateSettings, type Settings } from "@/lib/api/settings";
import { ApiRequestError } from "@/lib/api/client";
import { Tabs } from "@/components/shared/Tabs";
import { GeneralSettingsTab } from "./GeneralSettingsTab";
import { DeliverySettingsTab } from "./DeliverySettingsTab";
import { FraudSettingsTab } from "./FraudSettingsTab";
import { FinaSettingsTab } from "./FinaSettingsTab";
import { CartCompareSettingsTab } from "./CartCompareSettingsTab";
import { AnalyticsDashboardSettingsTab } from "./AnalyticsDashboardSettingsTab";
import { SearchRecommendationsSettingsTab } from "./SearchRecommendationsSettingsTab";
import { SessionAuthSettingsTab } from "./SessionAuthSettingsTab";
import { ImageSettingsTab } from "./ImageSettingsTab";
import { CacheTab } from "./CacheTab";

export function SettingsManager({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  async function save(next: Settings) {
    setSaving(true);
    try {
      const updated = await updateSettings(next);
      setSettings(updated);
      toast.success("პარამეტრი განახლდა");
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "პარამეტრის განახლება ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">პარამეტრები</h1>

      <div className="mt-6">
        <Tabs
          tabs={[
            {
              key: "general",
              label: "ზოგადი პარამეტრები",
              content: <GeneralSettingsTab settings={settings} saving={saving} onSave={save} />,
            },
            {
              key: "delivery",
              label: "მიტანა",
              content: <DeliverySettingsTab settings={settings} saving={saving} onSave={save} />,
            },
            {
              key: "fraud",
              label: "თაღლითობის ბარიერები",
              content: <FraudSettingsTab settings={settings} saving={saving} onSave={save} />,
            },
            {
              key: "fina",
              label: "FINA",
              content: <FinaSettingsTab settings={settings} saving={saving} onSave={save} />,
            },
            {
              key: "cart-compare",
              label: "კალათა და შედარება",
              content: <CartCompareSettingsTab settings={settings} saving={saving} onSave={save} />,
            },
            {
              key: "analytics-dashboard",
              label: "ანალიტიკა და დაფა",
              content: (
                <AnalyticsDashboardSettingsTab settings={settings} saving={saving} onSave={save} />
              ),
            },
            {
              key: "search-recommendations",
              label: "ძიება და რეკომენდაციები",
              content: (
                <SearchRecommendationsSettingsTab
                  settings={settings}
                  saving={saving}
                  onSave={save}
                />
              ),
            },
            {
              key: "session-auth",
              label: "სესია და ავტორიზაცია",
              content: <SessionAuthSettingsTab settings={settings} saving={saving} onSave={save} />,
            },
            {
              key: "images",
              label: "სურათები",
              content: <ImageSettingsTab settings={settings} saving={saving} onSave={save} />,
            },
            {
              key: "cache",
              label: "ქეში",
              content: <CacheTab settings={settings} saving={saving} onSave={save} />,
            },
          ]}
        />
      </div>
    </div>
  );
}

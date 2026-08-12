"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateSettings, type Settings } from "@/lib/api/settings";
import { ApiRequestError } from "@/lib/api/client";
import { Tabs } from "@/components/shared/Tabs";
import { GeneralSettingsTab } from "./GeneralSettingsTab";
import { DeliverySettingsTab } from "./DeliverySettingsTab";
import { FraudSettingsTab } from "./FraudSettingsTab";
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
              key: "cache",
              label: "ქეში",
              content: <CacheTab />,
            },
          ]}
        />
      </div>
    </div>
  );
}

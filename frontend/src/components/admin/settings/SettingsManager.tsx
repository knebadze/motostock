"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateSettings, type Settings } from "@/lib/api/settings";
import { ApiRequestError } from "@/lib/api/client";
import { Toggle } from "@/components/shared/Toggle";

export function SettingsManager({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  async function toggleCloudStorage(nextValue: boolean) {
    setSaving(true);
    try {
      const updated = await updateSettings({ useCloudStorage: nextValue });
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

      <div className="mt-6 rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">სურათების ღრუბლოვანი შენახვა</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ჩართვის შემთხვევაში ახლად ატვირთული სურათები შეინახება Cloudinary-ზე,
              სერვერის დისკის ნაცვლად. საჭიროებს წინასწარ მითითებულ Cloudinary
              ცვლადებს სერვერის გარემოში.
            </p>
          </div>

          <Toggle checked={settings.useCloudStorage} onChange={toggleCloudStorage} disabled={saving} />
        </div>
      </div>
    </div>
  );
}

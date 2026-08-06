"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateSettings, type Settings, type VinDecodeProvider } from "@/lib/api/settings";
import { ApiRequestError } from "@/lib/api/client";
import { Toggle } from "@/components/shared/Toggle";
import { Select } from "@/components/shared/Select";

const VIN_DECODE_PROVIDER_OPTIONS: { value: VinDecodeProvider; label: string }[] = [
  { value: "nhtsa", label: "NHTSA vPIC (უფასო — მხოლოდ აშშ-ის ბაზა)" },
  { value: "vincario", label: "Vincario (ფასიანი — გლობალური, მოტო/ATV-ს ჩათვლით)" },
];

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

          <Toggle
            checked={settings.useCloudStorage}
            onChange={(next) => save({ ...settings, useCloudStorage: next })}
            disabled={saving}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">VIN კოდით ველების შევსება</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ჩართვის შემთხვევაში მომხმარებელს გარაჟში ტექნიკის დამატებისას გამოუჩნდება
              VIN კოდის ველი და მისი დახმარებით წლის/ძრავის მონაცემების ავტომატური
              შევსების ღილაკი.
            </p>
          </div>

          <Toggle
            checked={settings.vinDecodeEnabled}
            onChange={(next) => save({ ...settings, vinDecodeEnabled: next })}
            disabled={saving}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label className="text-sm font-medium">API პროვაიდერი</label>
          <Select
            options={VIN_DECODE_PROVIDER_OPTIONS}
            value={settings.vinDecodeProvider}
            onChange={(next) =>
              save({ ...settings, vinDecodeProvider: next as VinDecodeProvider })
            }
            disabled={saving || !settings.vinDecodeEnabled}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">სასურველების სია სტუმრებისთვის</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ჩართვის შემთხვევაში დაულოგინებელ სტუმარსაც შეეძლება პროდუქტების და
              ტრანსპორტის სასურველებში დამატება (ინახება ბრაუზერის cookie-ით) —
              login-ისას ავტომატურად შეერწყმება მის ანგარიშს.
            </p>
          </div>

          <Toggle
            checked={settings.guestWishlistEnabled}
            onChange={(next) => save({ ...settings, guestWishlistEnabled: next })}
            disabled={saving}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">კალათა სტუმრებისთვის</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ჩართვის შემთხვევაში დაულოგინებელ სტუმარსაც შეეძლება პროდუქტების და
              ტრანსპორტის კალათაში დამატება (იგივე სტუმრის cookie-ით, რაც
              სასურველების სიას იყენებს) — login-ისას ავტომატურად შეერწყმება მის
              ანგარიშს (რაოდენობები შეიკრიბება, დამთხვევის შემთხვევაში).
            </p>
          </div>

          <Toggle
            checked={settings.guestCartEnabled}
            onChange={(next) => save({ ...settings, guestCartEnabled: next })}
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
}

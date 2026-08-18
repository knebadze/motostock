"use client";

import { useId } from "react";
import { Toggle } from "@/components/shared/Toggle";
import { Select } from "@/components/shared/Select";
import type { Settings, VinDecodeProvider } from "@/lib/api/settings";

const VIN_DECODE_PROVIDER_OPTIONS: { value: VinDecodeProvider; label: string }[] = [
  { value: "nhtsa", label: "NHTSA vPIC (უფასო — მხოლოდ აშშ-ის ბაზა)" },
  { value: "vincario", label: "Vincario (ფასიანი — გლობალური, მოტო/ATV-ს ჩათვლით)" },
];

export function GeneralSettingsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const vinProviderSelectId = useId();

  return (
    <>
      <div className="rounded-2xl border border-border p-5">
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
            onChange={(next) => onSave({ ...settings, useCloudStorage: next })}
            disabled={saving}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border p-5">
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
            onChange={(next) => onSave({ ...settings, vinDecodeEnabled: next })}
            disabled={saving}
          />
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={vinProviderSelectId} className="text-sm font-medium">
            API პროვაიდერი
          </label>
          <Select
            id={vinProviderSelectId}
            options={VIN_DECODE_PROVIDER_OPTIONS}
            value={settings.vinDecodeProvider}
            onChange={(next) =>
              onSave({ ...settings, vinDecodeProvider: next as VinDecodeProvider })
            }
            disabled={saving || !settings.vinDecodeEnabled}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border p-5">
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
            onChange={(next) => onSave({ ...settings, guestWishlistEnabled: next })}
            disabled={saving}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border p-5">
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
            onChange={(next) => onSave({ ...settings, guestCartEnabled: next })}
            disabled={saving}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">პრომო კოდის დაჯამება ფასდაკლებასთან</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ჩართვის შემთხვევაში checkout-ზე შეყვანილი პრომო კოდის ფასდაკლება
              დაემატება ნივთს, რომელსაც უკვე აქვს აქტიური ფასდაკლება (დაჯამდება).
              გამორთვისას ასეთ ნივთზე პრომო კოდი უბრალოდ არ გამოიყენება — ფასდაკლებას
              არ გაუთანაბრდება.
            </p>
          </div>

          <Toggle
            checked={settings.promoStackingEnabled}
            onChange={(next) => onSave({ ...settings, promoStackingEnabled: next })}
            disabled={saving}
          />
        </div>
      </div>
    </>
  );
}

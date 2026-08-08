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

type DeliveryDraft = Pick<
  Settings,
  | "deliveryTbilisiPrice"
  | "deliveryTbilisiTime"
  | "deliveryRegionsPrice"
  | "deliveryRegionsTime"
  | "deliveryExpressPrice"
  | "deliveryExpressTime"
>;

function deliveryDraftFrom(settings: Settings): DeliveryDraft {
  return {
    deliveryTbilisiPrice: settings.deliveryTbilisiPrice,
    deliveryTbilisiTime: settings.deliveryTbilisiTime,
    deliveryRegionsPrice: settings.deliveryRegionsPrice,
    deliveryRegionsTime: settings.deliveryRegionsTime,
    deliveryExpressPrice: settings.deliveryExpressPrice,
    deliveryExpressTime: settings.deliveryExpressTime,
  };
}

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export function SettingsManager({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [deliveryDraft, setDeliveryDraft] = useState<DeliveryDraft>(deliveryDraftFrom(initialSettings));

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

      <div className="mt-4 rounded-2xl border border-border p-5">
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
            onChange={(next) => save({ ...settings, promoStackingEnabled: next })}
            disabled={saving}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border p-5">
        <p className="font-medium text-foreground">მიტანის პარამეტრები</p>
        <p className="mt-1 text-sm text-muted-foreground">
          მიტანის დრო და ღირებულება — თბილისში, რეგიონებში და სწრაფი (ექსპრეს) მიტანისთვის.
        </p>

        <div className="mt-4 flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-foreground">თბილისი</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">მიტანის დრო</label>
                <input
                  type="text"
                  value={deliveryDraft.deliveryTbilisiTime}
                  onChange={(event) =>
                    setDeliveryDraft((draft) => ({ ...draft, deliveryTbilisiTime: event.target.value }))
                  }
                  placeholder="მაგ. 1-2 სამუშაო დღე"
                  className={inputClassName}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">ღირებულება (₾)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryDraft.deliveryTbilisiPrice}
                  onChange={(event) =>
                    setDeliveryDraft((draft) => ({
                      ...draft,
                      deliveryTbilisiPrice: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">რეგიონები</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">მიტანის დრო</label>
                <input
                  type="text"
                  value={deliveryDraft.deliveryRegionsTime}
                  onChange={(event) =>
                    setDeliveryDraft((draft) => ({ ...draft, deliveryRegionsTime: event.target.value }))
                  }
                  placeholder="მაგ. 3-5 სამუშაო დღე"
                  className={inputClassName}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">ღირებულება (₾)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryDraft.deliveryRegionsPrice}
                  onChange={(event) =>
                    setDeliveryDraft((draft) => ({
                      ...draft,
                      deliveryRegionsPrice: Number(event.target.value),
                    }))
                  }
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">სწრაფი (ექსპრეს) მიტანა</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">მიტანის დრო</label>
                <input
                  type="text"
                  value={deliveryDraft.deliveryExpressTime}
                  onChange={(event) =>
                    setDeliveryDraft((draft) => ({ ...draft, deliveryExpressTime: event.target.value }))
                  }
                  placeholder="მაგ. 2-4 საათი"
                  className={inputClassName}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">ღირებულება (₾)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryDraft.deliveryExpressPrice}
                  onChange={(event) =>
                    setDeliveryDraft((draft) => ({
                      ...draft,
                      deliveryExpressPrice: Number(event.target.value),
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
          onClick={() => save({ ...settings, ...deliveryDraft })}
          disabled={saving}
          className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          შენახვა
        </button>
      </div>
    </div>
  );
}

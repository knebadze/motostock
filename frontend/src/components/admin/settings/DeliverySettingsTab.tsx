"use client";

import { useState } from "react";
import type { Settings } from "@/lib/api/settings";

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

export function DeliverySettingsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const [deliveryDraft, setDeliveryDraft] = useState<DeliveryDraft>(deliveryDraftFrom(settings));

  return (
    <div className="rounded-2xl border border-border p-5">
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
        onClick={() => onSave({ ...settings, ...deliveryDraft })}
        disabled={saving}
        className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        შენახვა
      </button>
    </div>
  );
}

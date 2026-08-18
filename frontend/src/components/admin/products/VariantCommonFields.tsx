"use client";

import { Select } from "@/components/shared/Select";
import { Toggle } from "@/components/shared/Toggle";
import { FieldError } from "@/components/shared/FieldError";
import type { LookupItem } from "@/lib/api/lookups";

function lookupOptions(items: LookupItem[]) {
  return items.map((item) => ({ value: String(item.id), label: item.nameKa }));
}

// Shared by ProductVariantsPanel's add-form and edit-form, which were
// otherwise identical aside from size/color (add lets you multi-select to
// generate combinations; edit sets one specific size/color on an
// already-created variant) and the FINA ID field (edit-only, since it's
// assigned after the variant exists).
export function VariantCommonFields({
  idPrefix,
  conditions,
  statuses,
  conditionId,
  onConditionIdChange,
  statusId,
  onStatusIdChange,
  sku,
  onSkuChange,
  skuPlaceholder,
  finaId,
  onFinaIdChange,
  price,
  onPriceChange,
  priceError,
  stockQuantity,
  onStockQuantityChange,
  stockError,
  stockMin,
  isActive,
  onIsActiveChange,
}: {
  idPrefix: string;
  conditions: LookupItem[];
  statuses: LookupItem[];
  conditionId: string;
  onConditionIdChange: (value: string) => void;
  statusId: string;
  onStatusIdChange: (value: string) => void;
  sku: string;
  onSkuChange: (value: string) => void;
  skuPlaceholder?: string;
  finaId?: string;
  onFinaIdChange?: (value: string) => void;
  price: string;
  onPriceChange: (value: string) => void;
  priceError?: string;
  stockQuantity: string;
  onStockQuantityChange: (value: string) => void;
  stockError?: string;
  stockMin: number;
  isActive: boolean;
  onIsActiveChange: (checked: boolean) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-condition`} className="text-xs text-muted-foreground">
          მდგომარეობა
        </label>
        <Select
          id={`${idPrefix}-condition`}
          options={lookupOptions(conditions)}
          value={conditionId}
          onChange={onConditionIdChange}
          searchable
          placeholder="— არცერთი —"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-status`} className="text-xs text-muted-foreground">
          სტატუსი
        </label>
        <Select
          id={`${idPrefix}-status`}
          options={lookupOptions(statuses)}
          value={statusId}
          onChange={onStatusIdChange}
          searchable
          placeholder="— არცერთი —"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">SKU</label>
        <input
          type="text"
          value={sku}
          onChange={(event) => onSkuChange(event.target.value)}
          placeholder={skuPlaceholder}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
        />
      </div>
      {onFinaIdChange && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">FINA ID</label>
          <input
            type="number"
            value={finaId}
            onChange={(event) => onFinaIdChange(event.target.value)}
            placeholder="მარაგის სინქრონიზაციისთვის"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">ფასი *</label>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(event) => onPriceChange(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <FieldError message={priceError} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">მარაგში (ცალი)</label>
        <input
          type="number"
          min={stockMin}
          value={stockQuantity}
          onChange={(event) => onStockQuantityChange(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <FieldError message={stockError} />
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
        <Toggle checked={isActive} onChange={onIsActiveChange} />
        აქტიურია
      </label>
    </>
  );
}

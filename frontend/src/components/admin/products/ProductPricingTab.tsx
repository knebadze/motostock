"use client";

import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { Toggle } from "@/components/shared/Toggle";
import { ProductVariantImagesPanel } from "./ProductVariantImagesPanel";
import type { LookupItem } from "@/lib/api/lookups";
import type { FieldErrors } from "@/lib/validation/common";

function lookupOptions(items: LookupItem[]) {
  return items.map((item) => ({ value: String(item.id), label: item.nameKa }));
}

export type DraftVariant = {
  draftId: number;
  sizeId: number | null;
  colorId: number | null;
  conditionId: number | null;
  statusId: number | null;
  price: string;
  stockQuantity: string;
  sku: string;
  isActive: boolean;
};

function DraftVariantsTable({
  variants,
  sizes,
  colors,
  onChange,
  onRemove,
}: {
  variants: DraftVariant[];
  sizes: LookupItem[];
  colors: LookupItem[];
  onChange: (draftId: number, patch: Partial<DraftVariant>) => void;
  onRemove: (draftId: number) => void;
}) {
  if (variants.length === 0) return null;

  function labelFor(items: LookupItem[], id: number | null) {
    if (id == null) return "—";
    return items.find((item) => item.id === id)?.nameKa ?? "—";
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">ზომა</th>
            <th className="px-4 py-3 font-medium">ფერი</th>
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 font-medium">ფასი</th>
            <th className="px-4 py-3 font-medium">მარაგი</th>
            <th className="px-4 py-3 font-medium text-right">მოქმედება</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr key={variant.draftId} className="border-b border-border last:border-0">
              <td className="px-4 py-2 text-muted-foreground">{labelFor(sizes, variant.sizeId)}</td>
              <td className="px-4 py-2 text-muted-foreground">{labelFor(colors, variant.colorId)}</td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={variant.sku}
                  onChange={(event) => onChange(variant.draftId, { sku: event.target.value })}
                  className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-sm font-mono outline-none focus:border-primary"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  step="0.01"
                  value={variant.price}
                  onChange={(event) => onChange(variant.draftId, { price: event.target.value })}
                  className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  min={0}
                  value={variant.stockQuantity}
                  onChange={(event) => onChange(variant.draftId, { stockQuantity: event.target.value })}
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                />
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onRemove(variant.draftId)}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
                >
                  წაშლა
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Create-flow only tab: an optional variant matrix (one or more sellable
// variants generated from selected size/color combinations, + images +
// discount) filled in and saved together with the product in one action —
// see ProductForm.tsx's handleSubmit. Left empty, the product is created
// spec-only. Once a product exists, this tab is swapped out entirely for
// ProductVariantsPanel (edit mode) instead of being shown alongside it.
export function ProductPricingTab({
  sizes,
  colors,
  conditions,
  statuses,
  initialSizeIds,
  onInitialSizeIdsChange,
  initialColorIds,
  onInitialColorIdsChange,
  initialConditionId,
  onInitialConditionIdChange,
  initialStatusId,
  onInitialStatusIdChange,
  initialBaseSku,
  onInitialBaseSkuChange,
  initialBasePrice,
  onInitialBasePriceChange,
  initialBaseStockQuantity,
  onInitialBaseStockQuantityChange,
  initialIsActive,
  onInitialIsActiveChange,
  onGenerateDraftVariants,
  draftVariants,
  onDraftVariantChange,
  onDraftVariantRemove,
  onPendingVariantImageFilesChange,
  initialDiscountPercent,
  onInitialDiscountPercentChange,
  initialDiscountPrice,
  onInitialDiscountPriceChange,
  initialDiscountStartDate,
  onInitialDiscountStartDateChange,
  initialDiscountEndDate,
  onInitialDiscountEndDateChange,
  errors,
}: {
  sizes: LookupItem[];
  colors: LookupItem[];
  conditions: LookupItem[];
  statuses: LookupItem[];
  initialSizeIds: string[];
  onInitialSizeIdsChange: (ids: string[]) => void;
  initialColorIds: string[];
  onInitialColorIdsChange: (ids: string[]) => void;
  initialConditionId: string;
  onInitialConditionIdChange: (id: string) => void;
  initialStatusId: string;
  onInitialStatusIdChange: (id: string) => void;
  initialBaseSku: string;
  onInitialBaseSkuChange: (value: string) => void;
  initialBasePrice: string;
  onInitialBasePriceChange: (value: string) => void;
  initialBaseStockQuantity: string;
  onInitialBaseStockQuantityChange: (value: string) => void;
  initialIsActive: boolean;
  onInitialIsActiveChange: (value: boolean) => void;
  onGenerateDraftVariants: () => void;
  draftVariants: DraftVariant[];
  onDraftVariantChange: (draftId: number, patch: Partial<DraftVariant>) => void;
  onDraftVariantRemove: (draftId: number) => void;
  onPendingVariantImageFilesChange: (files: File[]) => void;
  initialDiscountPercent: string;
  onInitialDiscountPercentChange: (value: string) => void;
  initialDiscountPrice: string;
  onInitialDiscountPriceChange: (value: string) => void;
  initialDiscountStartDate: string;
  onInitialDiscountStartDateChange: (value: string) => void;
  initialDiscountEndDate: string;
  onInitialDiscountEndDateChange: (value: string) => void;
  errors: FieldErrors;
}) {
  return (
    <>
      <p className="text-xs text-muted-foreground">
        არასავალდებულოა — აირჩიეთ ზომები/ფერები და დააჭირეთ გენერაციას, პროდუქტთან ერთად
        დაემატება ყველა კომბინაცია ერთდროულად (სურათებითა და ფასდაკლებით — მხოლოდ პირველ
        გენერირებულ ვარიანტზე). ცარიელი დატოვების შემთხვევაში პროდუქტი შეინახება მხოლოდ
        სპეციფიკაციად — ვარიანტებს მოგვიანებით, რედაქტირებიდან დაამატებთ.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-pricing-sizes" className="text-xs text-muted-foreground">
            ზომები
          </label>
          <Select
            id="product-pricing-sizes"
            multiple
            options={lookupOptions(sizes)}
            value={initialSizeIds}
            onChange={onInitialSizeIdsChange}
            searchable
            placeholder="— არცერთი —"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-pricing-colors" className="text-xs text-muted-foreground">
            ფერები
          </label>
          <Select
            id="product-pricing-colors"
            multiple
            options={lookupOptions(colors)}
            value={initialColorIds}
            onChange={onInitialColorIdsChange}
            searchable
            placeholder="— არცერთი —"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-pricing-condition" className="text-xs text-muted-foreground">
            მდგომარეობა
          </label>
          <Select
            id="product-pricing-condition"
            options={lookupOptions(conditions)}
            value={initialConditionId}
            onChange={onInitialConditionIdChange}
            searchable
            placeholder="— არცერთი —"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-pricing-status" className="text-xs text-muted-foreground">
            სტატუსი
          </label>
          <Select
            id="product-pricing-status"
            options={lookupOptions(statuses)}
            value={initialStatusId}
            onChange={onInitialStatusIdChange}
            searchable
            placeholder="— არცერთი —"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">SKU</label>
          <input
            type="text"
            value={initialBaseSku}
            onChange={(event) => onInitialBaseSkuChange(event.target.value)}
            placeholder="საერთო ყველასთვის, ან ცარიელი"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">ფასი</label>
          <input
            type="number"
            step="0.01"
            value={initialBasePrice}
            onChange={(event) => onInitialBasePriceChange(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.price} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">მარაგში (ცალი)</label>
          <input
            type="number"
            min={1}
            value={initialBaseStockQuantity}
            onChange={(event) => onInitialBaseStockQuantityChange(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.stockQuantity} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <Toggle checked={initialIsActive} onChange={onInitialIsActiveChange} />
          აქტიურია
        </label>
      </div>

      <button
        type="button"
        onClick={onGenerateDraftVariants}
        className="w-fit rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        + ვარიანტების გენერაცია
      </button>

      <DraftVariantsTable
        variants={draftVariants}
        sizes={sizes}
        colors={colors}
        onChange={onDraftVariantChange}
        onRemove={onDraftVariantRemove}
      />

      {draftVariants.length > 0 && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">სურათები</label>
            <p className="text-xs text-muted-foreground">დაერთვება პირველ გენერირებულ ვარიანტს.</p>
            <ProductVariantImagesPanel
              variantId={null}
              onPendingFilesChange={onPendingVariantImageFilesChange}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <h3 className="text-sm font-semibold">ფასდაკლება (არასავალდებულო, პირველ ვარიანტზე)</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  placeholder="ფასდაკლება (%)"
                  value={initialDiscountPercent}
                  onChange={(event) => onInitialDiscountPercentChange(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.discountPercent} />
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  placeholder="ფასდაკლების ფასი"
                  value={initialDiscountPrice}
                  onChange={(event) => onInitialDiscountPriceChange(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.discountPrice} />
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  type="date"
                  value={initialDiscountStartDate}
                  onChange={(event) => onInitialDiscountStartDateChange(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.startDate} />
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  type="date"
                  value={initialDiscountEndDate}
                  onChange={(event) => onInitialDiscountEndDateChange(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <FieldError message={errors.endDate} />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

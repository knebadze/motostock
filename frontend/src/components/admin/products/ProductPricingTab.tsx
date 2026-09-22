"use client";

import { Select } from "@/components/shared/Select";
import { DateInput } from "@/components/shared/DateInput";
import { FieldError } from "@/components/shared/FieldError";
import { Toggle } from "@/components/shared/Toggle";
import { ProductVariantImagesPanel } from "./ProductVariantImagesPanel";
import type { LookupItem } from "@/lib/api/lookups";
import { MAX_DECIMAL_10_2, type FieldErrors } from "@/lib/validation/common";
import { generateVariantCombinations } from "@/lib/variant-matrix";

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
  // Each draft row is already independently editable (unlike
  // ProductVariantsPanel's edit-flow add-form, which generates several
  // variants from one shared form) — so, unlike there, finaId is just a
  // normal per-row field here, no shared-vs-per-combination distinction
  // needed. Still optional and still @unique DB-side (see
  // product-form-save.ts's createProductVariant call).
  finaId: string;
  isActive: boolean;
  // Own images + optional launch discount, not a single shared field
  // applying only to the first row — see product-form-save.ts's per-variant
  // loop, which uploads/creates these against whichever real variant this
  // draft becomes.
  imageFiles: File[];
  discountPercent: string;
  discountPrice: string;
  discountStartDate: string;
  discountEndDate: string;
};

function DraftVariantRow({
  variant,
  sizes,
  colors,
  expanded,
  onToggleExpanded,
  onChange,
  onRemove,
  errors,
}: {
  variant: DraftVariant;
  sizes: LookupItem[];
  colors: LookupItem[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (draftId: number, patch: Partial<DraftVariant>) => void;
  onRemove: (draftId: number) => void;
  errors: FieldErrors;
}) {
  const hasExtras = variant.imageFiles.length > 0 || variant.discountPrice.trim() !== "";

  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="px-4 py-2">
          <Select
            options={lookupOptions(sizes)}
            value={variant.sizeId != null ? String(variant.sizeId) : ""}
            onChange={(value) => onChange(variant.draftId, { sizeId: value ? Number(value) : null })}
            searchable
            placeholder="—"
            ariaLabel="ზომა"
          />
        </td>
        <td className="px-4 py-2">
          <Select
            options={lookupOptions(colors)}
            value={variant.colorId != null ? String(variant.colorId) : ""}
            onChange={(value) => onChange(variant.draftId, { colorId: value ? Number(value) : null })}
            searchable
            placeholder="—"
            ariaLabel="ფერი"
          />
        </td>
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
            value={variant.finaId}
            onChange={(event) => onChange(variant.draftId, { finaId: event.target.value })}
            placeholder="—"
            className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm font-mono outline-none focus:border-primary"
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            step="0.01"
            max={MAX_DECIMAL_10_2}
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
        <td className="px-4 py-2">
          <Toggle
            checked={variant.isActive}
            onChange={(value) => onChange(variant.draftId, { isActive: value })}
            label="აქტიურია"
          />
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-right">
          <button
            type="button"
            onClick={onToggleExpanded}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors hover:bg-muted ${
              hasExtras ? "text-primary" : "text-foreground"
            }`}
          >
            სურათები/ფასდაკლება {expanded ? "▲" : "▼"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(variant.draftId)}
            className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
          >
            წაშლა
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-muted/20 last:border-0">
          <td colSpan={8} className="px-4 py-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">სურათები</label>
                <ProductVariantImagesPanel
                  variantId={null}
                  initialFiles={variant.imageFiles}
                  onPendingFilesChange={(files) => onChange(variant.draftId, { imageFiles: files })}
                />
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <h4 className="text-sm font-semibold">ფასდაკლება (არასავალდებულო)</h4>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      step="0.01"
                      placeholder="ფასდაკლება (%)"
                      value={variant.discountPercent}
                      onChange={(event) => {
                        const value = event.target.value;
                        const percentNum = Number(value);
                        const priceNum = Number(variant.price);
                        const autoPrice =
                          value.trim() !== "" &&
                          Number.isFinite(percentNum) &&
                          percentNum >= 0 &&
                          percentNum <= 100 &&
                          variant.price.trim() !== ""
                            ? (priceNum * (1 - percentNum / 100)).toFixed(2)
                            : variant.discountPrice;
                        onChange(variant.draftId, { discountPercent: value, discountPrice: autoPrice });
                      }}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <FieldError message={errors[`draft-${variant.draftId}-discountPercent`]} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="ფასდაკლების ფასი"
                      value={variant.discountPrice}
                      onChange={(event) => onChange(variant.draftId, { discountPrice: event.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <FieldError message={errors[`draft-${variant.draftId}-discountPrice`]} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <DateInput
                      value={variant.discountStartDate}
                      onChange={(nextValue) => onChange(variant.draftId, { discountStartDate: nextValue })}
                    />
                    <FieldError message={errors[`draft-${variant.draftId}-startDate`]} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <DateInput
                      value={variant.discountEndDate}
                      onChange={(nextValue) => onChange(variant.draftId, { discountEndDate: nextValue })}
                    />
                    <FieldError message={errors[`draft-${variant.draftId}-endDate`]} />
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DraftVariantsTable({
  variants,
  sizes,
  colors,
  expandedDraftId,
  onToggleExpanded,
  onChange,
  onRemove,
  errors,
}: {
  variants: DraftVariant[];
  sizes: LookupItem[];
  colors: LookupItem[];
  expandedDraftId: number | null;
  onToggleExpanded: (draftId: number) => void;
  onChange: (draftId: number, patch: Partial<DraftVariant>) => void;
  onRemove: (draftId: number) => void;
  errors: FieldErrors;
}) {
  if (variants.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">ზომა</th>
            <th className="px-4 py-3 font-medium">ფერი</th>
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 font-medium">FINA ID</th>
            <th className="px-4 py-3 font-medium">ფასი</th>
            <th className="px-4 py-3 font-medium">მარაგი</th>
            <th className="px-4 py-3 font-medium">აქტიური</th>
            <th className="px-4 py-3 font-medium text-right">მოქმედება</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <DraftVariantRow
              key={variant.draftId}
              variant={variant}
              sizes={sizes}
              colors={colors}
              expanded={expandedDraftId === variant.draftId}
              onToggleExpanded={() => onToggleExpanded(variant.draftId)}
              onChange={onChange}
              onRemove={onRemove}
              errors={errors}
            />
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
  initialFinaId,
  onInitialFinaIdChange,
  initialBasePrice,
  onInitialBasePriceChange,
  initialBaseStockQuantity,
  onInitialBaseStockQuantityChange,
  initialIsActive,
  onInitialIsActiveChange,
  onGenerateDraftVariants,
  draftVariants,
  expandedDraftId,
  onToggleDraftVariantExpanded,
  onDraftVariantChange,
  onDraftVariantRemove,
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
  initialFinaId: string;
  onInitialFinaIdChange: (value: string) => void;
  initialBasePrice: string;
  onInitialBasePriceChange: (value: string) => void;
  initialBaseStockQuantity: string;
  onInitialBaseStockQuantityChange: (value: string) => void;
  initialIsActive: boolean;
  onInitialIsActiveChange: (value: boolean) => void;
  onGenerateDraftVariants: () => void;
  draftVariants: DraftVariant[];
  expandedDraftId: number | null;
  onToggleDraftVariantExpanded: (draftId: number) => void;
  onDraftVariantChange: (draftId: number, patch: Partial<DraftVariant>) => void;
  onDraftVariantRemove: (draftId: number) => void;
  errors: FieldErrors;
}) {
  // finaId is @unique, so the shared field below can only ever be usefully
  // typed in when the current size/color selection is about to generate
  // exactly one variant — a multi-row batch gets its FINA IDs per-row in
  // DraftVariantsTable instead (see handleGenerateDraftVariants).
  const willGenerateSingleVariant =
    generateVariantCombinations(initialSizeIds.map(Number), initialColorIds.map(Number)).length === 1;

  return (
    <>
      <p className="text-xs text-muted-foreground">
        არასავალდებულოა — აირჩიეთ ზომები/ფერები და დააჭირეთ გენერაციას, პროდუქტთან ერთად
        დაემატება ყველა კომბინაცია ერთდროულად. თითოეულ დამატებულ ვარიანტს ცალკე შეგიძლიათ
        დაურთოთ სურათები და ფასდაკლება (იხილეთ „სურათები/ფასდაკლება&rdquo; ღილაკი მისივე
        მწკრივზე). ცარიელი დატოვების შემთხვევაში პროდუქტი შეინახება მხოლოდ
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
        {willGenerateSingleVariant && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">FINA ID</label>
            <input
              type="number"
              value={initialFinaId}
              onChange={(event) => onInitialFinaIdChange(event.target.value)}
              placeholder="მარაგის სინქრონიზაციისთვის"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">ფასი</label>
          <input
            type="number"
            step="0.01"
            max={MAX_DECIMAL_10_2}
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
        expandedDraftId={expandedDraftId}
        onToggleExpanded={onToggleDraftVariantExpanded}
        onChange={onDraftVariantChange}
        onRemove={onDraftVariantRemove}
        errors={errors}
      />
    </>
  );
}

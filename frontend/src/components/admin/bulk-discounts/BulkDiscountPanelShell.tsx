"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { DateInput } from "@/components/shared/DateInput";
import { FieldError } from "@/components/shared/FieldError";
import { Loader } from "@/components/shared/Loader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { applyBulkDiscounts, type BulkDiscountTargetType } from "@/lib/api/bulk-discounts";
import { uploadBulkDiscountEventImage } from "@/lib/api/bulk-discount-events";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree } from "@/lib/categories-tree";
import { bulkDiscountFormSchema } from "@/lib/validation/bulk-discounts";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";
import { useBulkDiscountSelection } from "@/components/shared/useBulkDiscountSelection";
import { useAdminRole } from "@/components/admin/AdminRoleContext";
import { BulkDiscountEventFields, useBulkDiscountEventDraft } from "./BulkDiscountEventFields";

// What a target type's candidate list (filters + table) gets from the shell.
// Rendered with key={categoryId}, so its own filter state resets whenever
// the category changes — but survives the post-apply candidate reload.
export type CandidateListProps<T> = {
  candidates: T[];
  selectedIds: Set<number>;
  toggleOne: (id: number, checked: boolean) => void;
  selectVisible: (ids: number[]) => void;
  deselectVisible: (ids: number[]) => void;
  clearSelection: () => void;
};

export type BulkDiscountPanelCopy = {
  intro: ReactNode;
  categoryPlaceholder: string;
  categoryAriaLabel: string;
  loadError: string;
  // Georgian noun forms of one item — "ვარიანტი" / "ვარიანტზე" /
  // "თითოეულ ვარიანტს" (and the განცხადება equivalents).
  itemNoun: string;
  itemNounDative: string;
  eachItemLabel: string;
};

// Everything PRODUCT and VEHICLE_LISTING bulk discounts have in common: the
// category picker, candidate loading, the cross-filter selection set, the
// optional event draft, the percent/date form and the apply call (one merged
// bulk-discounts API for both — see bulk-discounts.ts's
// BulkApplyDiscountsInput). Only the candidate list itself differs per type
// (see BulkDiscountsPanel.tsx).
export function BulkDiscountPanelShell<T>({
  categories,
  targetType,
  includeCategory,
  loadCandidates,
  copy,
  renderCandidates,
}: {
  categories: Category[];
  targetType: BulkDiscountTargetType;
  includeCategory: (categories: Category[], categoryId: number) => boolean;
  loadCandidates: (categoryId: number) => Promise<T[]>;
  copy: BulkDiscountPanelCopy;
  renderCandidates: (props: CandidateListProps<T>) => ReactNode;
}) {
  const isOperator = useAdminRole() === "OPERATOR";
  const categoryOptions = useMemo(() => {
    const scoped = categories.filter((category) => includeCategory(categories, category.id));
    return flattenTree(scoped).map((category) => ({
      value: String(category.id),
      label: `${"— ".repeat(category.depth)}${category.name.ka}`,
    }));
  }, [categories, includeCategory]);

  const [categoryId, setCategoryId] = useState("");
  const [candidates, setCandidates] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);

  const {
    selectedIds,
    setSelectedIds,
    toggleOne,
    selectVisible,
    deselectVisible,
    highPercentConfirmOpen,
    setHighPercentConfirmOpen,
    handleApplyClick: applyWithHighPercentGate,
  } = useBulkDiscountSelection();

  const [discountPercent, setDiscountPercent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applying, setApplying] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const eventDraft = useBulkDiscountEventDraft();

  useEffect(() => {
    if (!categoryId) return;

    let cancelled = false;
    loadCandidates(Number(categoryId))
      .then((items) => {
        if (cancelled) return;
        setCandidates(items);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) toast.error(copy.loadError);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId, loadCandidates, copy.loadError]);

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setLoaded(false);
    setCandidates([]);
    setSelectedIds(new Set());
  }

  async function handleApply() {
    const result = bulkDiscountFormSchema.safeParse({ discountPercent, startDate, endDate });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error(`აირჩიეთ მინიმუმ ერთი ${copy.itemNoun}`);
      return;
    }
    if (eventDraft.enabled && !eventDraft.nameComplete) {
      toast.error("ივენთის სახელი საჭიროა სამივე ენაზე");
      return;
    }
    setErrors({});
    setApplying(true);

    try {
      const applied = await applyBulkDiscounts({
        targetType,
        itemIds: Array.from(selectedIds),
        discountPercent: Number(discountPercent),
        startDate,
        endDate,
        event: eventDraft.toEventInput(),
      });
      toast.success(`ფასდაკლება დაემატა ${selectedIds.size} ${copy.itemNounDative}`);

      if (applied.eventId && eventDraft.image.file) {
        try {
          await uploadBulkDiscountEventImage(applied.eventId, eventDraft.image.file);
        } catch {
          toast.error("ივენთი შეიქმნა, მაგრამ სურათის ატვირთვა ვერ მოხერხდა");
        }
      }

      setDiscountPercent("");
      setStartDate("");
      setEndDate("");
      setSelectedIds(new Set());
      eventDraft.reset();
      if (categoryId) setCandidates(await loadCandidates(Number(categoryId)));
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "ვერ მოხერხდა");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{copy.intro}</p>

      <div className="w-full max-w-md">
        <Select
          options={categoryOptions}
          value={categoryId}
          onChange={handleCategoryChange}
          searchable
          placeholder={copy.categoryPlaceholder}
          ariaLabel={copy.categoryAriaLabel}
        />
      </div>

      {categoryId && !loaded && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader size="xs" /> იტვირთება...
        </div>
      )}

      {loaded && (
        <>
          <div key={categoryId} className="flex flex-col gap-4">
            {renderCandidates({
              candidates,
              selectedIds,
              toggleOne,
              selectVisible,
              deselectVisible,
              clearSelection: () => setSelectedIds(new Set()),
            })}
          </div>

          <BulkDiscountEventFields draft={eventDraft} separateItemsLabel={copy.eachItemLabel} />

          <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium">ფასდაკლება (%) *</label>
              <input
                type="number"
                min={0}
                max={99}
                step="0.01"
                value={discountPercent}
                onChange={(event) => setDiscountPercent(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.discountPercent} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium">დაწყება *</label>
              <DateInput value={startDate} onChange={setStartDate} />
              <FieldError message={errors.startDate} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium">დასრულება *</label>
              <DateInput value={endDate} onChange={setEndDate} />
              <FieldError message={errors.endDate} />
            </div>
            {!isOperator && (
              <button
                type="button"
                onClick={() => applyWithHighPercentGate(discountPercent, handleApply)}
                disabled={applying || selectedIds.size === 0}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {applying && <Loader size="xs" />}
                გამოყენება ({selectedIds.size} {copy.itemNounDative})
              </button>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={highPercentConfirmOpen}
        onClose={() => setHighPercentConfirmOpen(false)}
        title="მაღალი ფასდაკლების დადასტურება"
        message={`დარწმუნებული ხართ, რომ გსურთ ${discountPercent}%-იანი ფასდაკლების გამოყენება ${selectedIds.size} ${copy.itemNounDative}?`}
        confirmLabel="გამოყენება"
        onConfirm={handleApply}
      />
    </div>
  );
}

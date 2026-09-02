"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { Loader } from "@/components/shared/Loader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  applyBulkProductDiscounts,
  listBulkDiscountCandidates,
  type BulkDiscountCandidate,
} from "@/lib/api/bulk-product-discounts";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree } from "@/lib/categories-tree";
import { formatPrice, toTbilisiDateOnly } from "@/lib/format";
import { bulkProductDiscountFormSchema } from "@/lib/validation/bulk-product-discounts";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

function candidateAttributeSummary(candidate: BulkDiscountCandidate): string {
  return candidate.attributeValues
    .filter((value) => value.option)
    .map((value) => `${value.attributeName.ka}: ${value.option?.label.ka}`)
    .join(", ");
}

export function BulkProductDiscountsPanel({ categories }: { categories: Category[] }) {
  const categoryOptions = useMemo(
    () =>
      flattenTree(categories).map((category) => ({
        value: String(category.id),
        label: `${"— ".repeat(category.depth)}${category.name.ka}`,
      })),
    [categories],
  );

  const [categoryId, setCategoryId] = useState("");
  const [candidates, setCandidates] = useState<BulkDiscountCandidate[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [sizeFilter, setSizeFilter] = useState<string[]>([]);
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<Record<number, string[]>>({});

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [discountPercent, setDiscountPercent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applying, setApplying] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [highPercentConfirmOpen, setHighPercentConfirmOpen] = useState(false);

  useEffect(() => {
    if (!categoryId) return;

    let cancelled = false;
    listBulkDiscountCandidates(Number(categoryId))
      .then((items) => {
        if (cancelled) return;
        setCandidates(items);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) toast.error("პროდუქტების ჩატვირთვა ვერ მოხერხდა");
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    setLoaded(false);
    setCandidates([]);
    setSelectedIds(new Set());
    setSearch("");
    setBrandFilter([]);
    setSizeFilter([]);
    setColorFilter([]);
    setAttributeFilters({});
  }

  const brandOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const candidate of candidates) {
      if (candidate.brand) map.set(candidate.brand.id, candidate.brand.name);
    }
    return Array.from(map, ([id, label]) => ({ value: String(id), label }));
  }, [candidates]);

  const sizeOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const candidate of candidates) {
      if (candidate.size) map.set(candidate.size.id, candidate.size.nameKa);
    }
    return Array.from(map, ([id, label]) => ({ value: String(id), label }));
  }, [candidates]);

  const colorOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const candidate of candidates) {
      if (candidate.color) map.set(candidate.color.id, candidate.color.nameKa);
    }
    return Array.from(map, ([id, label]) => ({ value: String(id), label }));
  }, [candidates]);

  // One multi-select filter per SELECT-type attribute actually present in
  // the category's products (e.g. "მასალა" for helmets) — derived straight
  // from the fetched candidates, so it automatically fits whatever
  // attributes the chosen category happens to have.
  const attributeFilterDefs = useMemo(() => {
    const map = new Map<number, { label: string; options: Map<number, string> }>();
    for (const candidate of candidates) {
      for (const value of candidate.attributeValues) {
        if (value.valueType !== "SELECT" || !value.option) continue;
        let entry = map.get(value.attributeId);
        if (!entry) {
          entry = { label: value.attributeName.ka, options: new Map() };
          map.set(value.attributeId, entry);
        }
        entry.options.set(value.option.id, value.option.label.ka);
      }
    }
    return Array.from(map, ([attributeId, { label, options }]) => ({
      attributeId,
      label,
      options: Array.from(options, ([value, optionLabel]) => ({ value: String(value), label: optionLabel })),
    }));
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (query && !candidate.productName.ka.toLowerCase().includes(query)) return false;
      if (brandFilter.length > 0 && (!candidate.brand || !brandFilter.includes(String(candidate.brand.id))))
        return false;
      if (sizeFilter.length > 0 && (!candidate.size || !sizeFilter.includes(String(candidate.size.id))))
        return false;
      if (colorFilter.length > 0 && (!candidate.color || !colorFilter.includes(String(candidate.color.id))))
        return false;
      for (const [attributeIdText, selectedOptionIds] of Object.entries(attributeFilters)) {
        if (selectedOptionIds.length === 0) continue;
        const attributeId = Number(attributeIdText);
        const match = candidate.attributeValues.find((value) => value.attributeId === attributeId);
        if (!match?.option || !selectedOptionIds.includes(String(match.option.id))) return false;
      }
      return true;
    });
  }, [candidates, search, brandFilter, sizeFilter, colorFilter, attributeFilters]);

  function toggleOne(variantId: number, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(variantId);
      else next.delete(variantId);
      return next;
    });
  }

  function selectVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const candidate of filteredCandidates) next.add(candidate.variantId);
      return next;
    });
  }

  function deselectVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const candidate of filteredCandidates) next.delete(candidate.variantId);
      return next;
    });
  }

  async function handleApply() {
    const result = bulkProductDiscountFormSchema.safeParse({ discountPercent, startDate, endDate });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("აირჩიეთ მინიმუმ ერთი ვარიანტი");
      return;
    }
    setErrors({});
    setApplying(true);

    try {
      await applyBulkProductDiscounts({
        variantIds: Array.from(selectedIds),
        discountPercent: Number(discountPercent),
        startDate,
        endDate,
      });
      toast.success(`ფასდაკლება დაემატა ${selectedIds.size} ვარიანტზე`);
      setDiscountPercent("");
      setStartDate("");
      setEndDate("");
      setSelectedIds(new Set());
      if (categoryId) setCandidates(await listBulkDiscountCandidates(Number(categoryId)));
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setApplying(false);
    }
  }

  // A discount over 50% is unusual enough to be worth a second look before
  // it's applied — this hits every one of the (potentially many) selected
  // variants at once, so a typo here is more costly than on a single-item
  // discount form.
  function handleApplyClick() {
    const percentNum = Number(discountPercent);
    if (discountPercent.trim() !== "" && Number.isFinite(percentNum) && percentNum > 50) {
      setHighPercentConfirmOpen(true);
      return;
    }
    handleApply();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        აირჩიეთ კატეგორია — ჩამოიტვირთება მისი (და ქვეკატეგორიების) ყველა პროდუქტის ვარიანტი.
        დაფილტრეთ ბრენდის, ზომის, ფერის ან მახასიათებლების მიხედვით და მონიშნეთ ჩექბოქსებით ზუსტად
        ის ვარიანტები, რომლებზეც გსურთ ფასდაკლების გამოყენება — მონიშვნა ინარჩუნებს მდგომარეობას
        ფილტრის შეცვლისასაც, ასე რომ შეგიძლიათ რამდენიმე ჯერ სხვადასხვა ფილტრით მონიშნოთ სხვადასხვა
        ვარიანტები ერთ კამპანიაში. შედეგად შექმნილი ფასდაკლებები უშუალოდ დაემატება პროდუქტის
        ვარიანტების ფასდაკლების ცხრილს — შემდეგ, თითოეული ინდივიდუალურად რედაქტირებადია/გასაუქმებელია
        იქიდანვე.
      </p>

      <div className="w-full max-w-md">
        <Select
          options={categoryOptions}
          value={categoryId}
          onChange={handleCategoryChange}
          searchable
          placeholder="აირჩიეთ კატეგორია"
          ariaLabel="კატეგორია"
        />
      </div>

      {categoryId && !loaded && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader size="xs" /> იტვირთება...
        </div>
      )}

      {loaded && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ძებნა სახელით"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <Select
              multiple
              options={brandOptions}
              value={brandFilter}
              onChange={setBrandFilter}
              searchable
              placeholder="ბრენდი"
              ariaLabel="ბრენდის ფილტრი"
            />
            <Select
              multiple
              options={sizeOptions}
              value={sizeFilter}
              onChange={setSizeFilter}
              searchable
              placeholder="ზომა"
              ariaLabel="ზომის ფილტრი"
            />
            <Select
              multiple
              options={colorOptions}
              value={colorFilter}
              onChange={setColorFilter}
              searchable
              placeholder="ფერი"
              ariaLabel="ფერის ფილტრი"
            />
            {attributeFilterDefs.map((definition) => (
              <Select
                key={definition.attributeId}
                multiple
                options={definition.options}
                value={attributeFilters[definition.attributeId] ?? []}
                onChange={(value) =>
                  setAttributeFilters((current) => ({ ...current, [definition.attributeId]: value }))
                }
                searchable
                placeholder={definition.label}
                ariaLabel={definition.label}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              ნაჩვენებია {filteredCandidates.length} / {candidates.length} ვარიანტი — მონიშნულია{" "}
              <span className="font-semibold text-foreground">{selectedIds.size}</span>
            </span>
            <div className="flex gap-3 text-xs">
              <button type="button" onClick={selectVisible} className="text-primary hover:underline">
                ხილულის მონიშვნა
              </button>
              <button type="button" onClick={deselectVisible} className="text-muted-foreground hover:underline">
                ხილულის მოხსნა
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-muted-foreground hover:underline"
              >
                მთლიანად გასუფთავება
              </button>
            </div>
          </div>

          <div className="max-h-[32rem] overflow-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-border bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2 font-medium">პროდუქტი</th>
                  <th className="px-3 py-2 font-medium">ბრენდი</th>
                  <th className="px-3 py-2 font-medium">მახასიათებლები</th>
                  <th className="px-3 py-2 font-medium">ზომა</th>
                  <th className="px-3 py-2 font-medium">ფერი</th>
                  <th className="px-3 py-2 font-medium">ფასი</th>
                  <th className="px-3 py-2 font-medium">ფასდაკლება</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      ვარიანტი ვერ მოიძებნა
                    </td>
                  </tr>
                )}
                {filteredCandidates.map((candidate) => (
                  <tr
                    key={candidate.variantId}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(candidate.variantId)}
                        onChange={(event) => toggleOne(candidate.variantId, event.target.checked)}
                        className="size-4 rounded border-border accent-primary"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {candidate.productName.ka}
                      {candidate.sku && <span className="ml-1.5 text-xs text-muted-foreground">({candidate.sku})</span>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{candidate.brand?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{candidateAttributeSummary(candidate) || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{candidate.size?.nameKa ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{candidate.color?.nameKa ?? "—"}</td>
                    <td className="px-3 py-2">{formatPrice(candidate.price)}</td>
                    <td className="px-3 py-2">
                      {candidate.activeDiscount ? (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
                          {candidate.activeDiscount.discountPercent != null
                            ? `${candidate.activeDiscount.discountPercent}%`
                            : "აქტიური"}{" "}
                          → {toTbilisiDateOnly(candidate.activeDiscount.endDate)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.startDate} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium">დასრულება *</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <FieldError message={errors.endDate} />
            </div>
            <button
              type="button"
              onClick={handleApplyClick}
              disabled={applying || selectedIds.size === 0}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {applying && <Loader size="xs" />}
              გამოყენება ({selectedIds.size} ვარიანტზე)
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={highPercentConfirmOpen}
        onClose={() => setHighPercentConfirmOpen(false)}
        title="მაღალი ფასდაკლების დადასტურება"
        message={`დარწმუნებული ხართ, რომ გსურთ ${discountPercent}%-იანი ფასდაკლების გამოყენება ${selectedIds.size} ვარიანტზე?`}
        confirmLabel="გამოყენება"
        onConfirm={handleApply}
      />
    </div>
  );
}

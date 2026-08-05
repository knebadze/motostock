"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { Loader } from "@/components/shared/Loader";
import {
  applyBulkVehicleListingDiscounts,
  listBulkVehicleDiscountCandidates,
  type BulkVehicleDiscountCandidate,
} from "@/lib/api/bulk-vehicle-listing-discounts";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree, isVehicleCategory } from "@/lib/categories-tree";
import { formatPrice } from "@/lib/format";
import { bulkProductDiscountFormSchema } from "@/lib/validation/bulk-product-discounts";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

function candidateLabel(candidate: BulkVehicleDiscountCandidate): string {
  return `${candidate.brand.name.ka} ${candidate.model.name.ka}${candidate.variant ? ` — ${candidate.variant}` : ""} (${candidate.year})`;
}

function candidateSpecSummary(candidate: BulkVehicleDiscountCandidate): string {
  return candidate.specValues.map((spec) => `${spec.fieldLabel.ka}: ${spec.value.nameKa}`).join(", ");
}

export function BulkVehicleListingDiscountsPanel({ categories }: { categories: Category[] }) {
  const vehicleCategoryOptions = useMemo(() => {
    const vehicleCategories = categories.filter((category) => isVehicleCategory(categories, category.id));
    return flattenTree(vehicleCategories).map((category) => ({
      value: String(category.id),
      label: `${"— ".repeat(category.depth)}${category.name.ka}`,
    }));
  }, [categories]);

  const [categoryId, setCategoryId] = useState("");
  const [candidates, setCandidates] = useState<BulkVehicleDiscountCandidate[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [conditionFilter, setConditionFilter] = useState<string[]>([]);
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [specFilters, setSpecFilters] = useState<Record<string, string[]>>({});

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [discountPercent, setDiscountPercent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applying, setApplying] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!categoryId) return;

    let cancelled = false;
    listBulkVehicleDiscountCandidates(Number(categoryId))
      .then((items) => {
        if (cancelled) return;
        setCandidates(items);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) toast.error("განცხადებების ჩატვირთვა ვერ მოხერხდა");
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
    setConditionFilter([]);
    setColorFilter([]);
    setSpecFilters({});
  }

  const brandOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const candidate of candidates) map.set(candidate.brand.id, candidate.brand.name.ka);
    return Array.from(map, ([id, label]) => ({ value: String(id), label }));
  }, [candidates]);

  const conditionOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const candidate of candidates) map.set(candidate.condition.id, candidate.condition.nameKa);
    return Array.from(map, ([id, label]) => ({ value: String(id), label }));
  }, [candidates]);

  const colorOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const candidate of candidates) map.set(candidate.color.id, candidate.color.nameKa);
    return Array.from(map, ([id, label]) => ({ value: String(id), label }));
  }, [candidates]);

  // One multi-select filter per spec field actually present among the
  // fetched candidates (e.g. "საწვავის ტიპი") — derived from the data
  // itself rather than a static list, same approach as the product side's
  // attribute filters.
  const specFilterDefs = useMemo(() => {
    const map = new Map<string, { label: string; options: Map<number, string> }>();
    for (const candidate of candidates) {
      for (const spec of candidate.specValues) {
        let entry = map.get(spec.field);
        if (!entry) {
          entry = { label: spec.fieldLabel.ka, options: new Map() };
          map.set(spec.field, entry);
        }
        entry.options.set(spec.value.id, spec.value.nameKa);
      }
    }
    return Array.from(map, ([field, { label, options }]) => ({
      field,
      label,
      options: Array.from(options, ([value, optionLabel]) => ({ value: String(value), label: optionLabel })),
    }));
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (query && !candidateLabel(candidate).toLowerCase().includes(query)) return false;
      if (brandFilter.length > 0 && !brandFilter.includes(String(candidate.brand.id))) return false;
      if (conditionFilter.length > 0 && !conditionFilter.includes(String(candidate.condition.id))) return false;
      if (colorFilter.length > 0 && !colorFilter.includes(String(candidate.color.id))) return false;
      for (const [field, selectedValueIds] of Object.entries(specFilters)) {
        if (selectedValueIds.length === 0) continue;
        const match = candidate.specValues.find((spec) => spec.field === field);
        if (!match || !selectedValueIds.includes(String(match.value.id))) return false;
      }
      return true;
    });
  }, [candidates, search, brandFilter, conditionFilter, colorFilter, specFilters]);

  function toggleOne(vehicleListingId: number, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(vehicleListingId);
      else next.delete(vehicleListingId);
      return next;
    });
  }

  function selectVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const candidate of filteredCandidates) next.add(candidate.vehicleListingId);
      return next;
    });
  }

  function deselectVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const candidate of filteredCandidates) next.delete(candidate.vehicleListingId);
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
      toast.error("აირჩიეთ მინიმუმ ერთი განცხადება");
      return;
    }
    setErrors({});
    setApplying(true);

    try {
      await applyBulkVehicleListingDiscounts({
        vehicleListingIds: Array.from(selectedIds),
        discountPercent: Number(discountPercent),
        startDate,
        endDate,
      });
      toast.success(`ფასდაკლება დაემატა ${selectedIds.size} განცხადებაზე`);
      setDiscountPercent("");
      setStartDate("");
      setEndDate("");
      setSelectedIds(new Set());
      if (categoryId) setCandidates(await listBulkVehicleDiscountCandidates(Number(categoryId)));
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        აირჩიეთ ტრანსპორტის კატეგორია — ჩამოიტვირთება მისი (და ქვეკატეგორიების) ყველა გასაყიდი
        განცხადება. დაფილტრეთ მარკის, მდგომარეობის, ფერის ან მახასიათებლების მიხედვით და მონიშნეთ
        ჩექბოქსებით ზუსტად ის განცხადებები, რომლებზეც გსურთ ფასდაკლების გამოყენება — მონიშვნა
        ინარჩუნებს მდგომარეობას ფილტრის შეცვლისასაც. შედეგად შექმნილი ფასდაკლებები უშუალოდ
        დაემატება განცხადების ფასდაკლების ცხრილს — შემდეგ, თითოეული ინდივიდუალურად
        რედაქტირებადია/გასაუქმებელია იქიდანვე.
      </p>

      <div className="w-full max-w-md">
        <Select
          options={vehicleCategoryOptions}
          value={categoryId}
          onChange={handleCategoryChange}
          searchable
          placeholder="აირჩიეთ ტრანსპორტის კატეგორია"
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
              placeholder="ძებნა მარკით/მოდელით"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <Select multiple options={brandOptions} value={brandFilter} onChange={setBrandFilter} searchable placeholder="მარკა" />
            <Select
              multiple
              options={conditionOptions}
              value={conditionFilter}
              onChange={setConditionFilter}
              searchable
              placeholder="მდგომარეობა"
            />
            <Select multiple options={colorOptions} value={colorFilter} onChange={setColorFilter} searchable placeholder="ფერი" />
            {specFilterDefs.map((definition) => (
              <Select
                key={definition.field}
                multiple
                options={definition.options}
                value={specFilters[definition.field] ?? []}
                onChange={(value) => setSpecFilters((current) => ({ ...current, [definition.field]: value }))}
                searchable
                placeholder={definition.label}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              ნაჩვენებია {filteredCandidates.length} / {candidates.length} განცხადება — მონიშნულია{" "}
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
                  <th className="px-3 py-2 font-medium">ტექნიკა</th>
                  <th className="px-3 py-2 font-medium">მდგომარეობა</th>
                  <th className="px-3 py-2 font-medium">ფერი</th>
                  <th className="px-3 py-2 font-medium">მახასიათებლები</th>
                  <th className="px-3 py-2 font-medium">ფასი</th>
                  <th className="px-3 py-2 font-medium">ფასდაკლება</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      განცხადება ვერ მოიძებნა
                    </td>
                  </tr>
                )}
                {filteredCandidates.map((candidate) => (
                  <tr
                    key={candidate.vehicleListingId}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(candidate.vehicleListingId)}
                        onChange={(event) => toggleOne(candidate.vehicleListingId, event.target.checked)}
                        className="size-4 rounded border-border accent-primary"
                      />
                    </td>
                    <td className="px-3 py-2">{candidateLabel(candidate)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{candidate.condition.nameKa}</td>
                    <td className="px-3 py-2 text-muted-foreground">{candidate.color.nameKa}</td>
                    <td className="px-3 py-2 text-muted-foreground">{candidateSpecSummary(candidate) || "—"}</td>
                    <td className="px-3 py-2">{formatPrice(candidate.price)}</td>
                    <td className="px-3 py-2">
                      {candidate.activeDiscount ? (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-400">
                          {candidate.activeDiscount.discountPercent != null
                            ? `${candidate.activeDiscount.discountPercent}%`
                            : "აქტიური"}{" "}
                          → {candidate.activeDiscount.endDate.slice(0, 10)}
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
                max={100}
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
              onClick={handleApply}
              disabled={applying || selectedIds.size === 0}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {applying && <Loader size="xs" />}
              გამოყენება ({selectedIds.size} განცხადებაზე)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { Loader } from "@/components/shared/Loader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Toggle } from "@/components/shared/Toggle";
import { useFileUploadPreview } from "@/components/shared/useFileUploadPreview";
import {
  applyBulkDiscounts,
  listBulkDiscountCandidates,
  type BulkDiscountCandidate,
  type BulkVehicleDiscountCandidate,
} from "@/lib/api/bulk-discounts";
import { uploadBulkDiscountEventImage } from "@/lib/api/bulk-discount-events";
import type { Category } from "@/lib/api/categories";
import { ApiRequestError } from "@/lib/api/client";
import { flattenTree, isVehicleCategory } from "@/lib/categories-tree";
import { formatPrice, toTbilisiDateOnly } from "@/lib/format";
import { bulkDiscountFormSchema } from "@/lib/validation/bulk-discounts";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";
import { deriveOptionMap, useBulkDiscountSelection } from "@/components/shared/useBulkDiscountSelection";

// PRODUCT and VEHICLE_LISTING share the exact same apply/date/event-grouping
// mechanics (see bulk-discounts.ts's BulkApplyDiscountsInput) — only the
// candidate table itself genuinely differs (product variants have
// sku/size/attributeValues, vehicle listings have year/condition/
// specValues), so this file keeps two components, one per table shape, but
// both now call the one merged bulk-discounts API instead of a whole
// duplicated module per target type.

function candidateAttributeSummary(candidate: BulkDiscountCandidate): string {
  return candidate.attributeValues
    .filter((value) => value.option)
    .map((value) => `${value.attributeName.ka}: ${value.option?.label.ka}`)
    .join(", ");
}

export function BulkProductDiscountsPanel({ categories }: { categories: Category[] }) {
  const categoryOptions = useMemo(() => {
    // Excludes vehicle (transport) categories — those are vehicle listings,
    // not products, and belong only in BulkVehicleListingDiscountsPanel's
    // own category picker below.
    const productCategories = categories.filter((category) => !isVehicleCategory(categories, category.id));
    return flattenTree(productCategories).map((category) => ({
      value: String(category.id),
      label: `${"— ".repeat(category.depth)}${category.name.ka}`,
    }));
  }, [categories]);

  const [categoryId, setCategoryId] = useState("");
  const [candidates, setCandidates] = useState<BulkDiscountCandidate[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [sizeFilter, setSizeFilter] = useState<string[]>([]);
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<Record<number, string[]>>({});

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

  // Opt-in grouping — off by default, and off means this batch is applied
  // exactly as it always was (no event field sent at all). See
  // handleApply's own comment.
  const [createEvent, setCreateEvent] = useState(false);
  const [eventNameKa, setEventNameKa] = useState("");
  const [eventNameEn, setEventNameEn] = useState("");
  const [eventNameRu, setEventNameRu] = useState("");
  const [eventDescriptionKa, setEventDescriptionKa] = useState("");
  const [eventDescriptionEn, setEventDescriptionEn] = useState("");
  const [eventDescriptionRu, setEventDescriptionRu] = useState("");
  const {
    file: eventImageFile,
    previewUrl: eventImagePreviewUrl,
    onChange: handleEventImageChange,
    reset: resetEventImage,
  } = useFileUploadPreview(null);

  function resetEventFields() {
    setCreateEvent(false);
    setEventNameKa("");
    setEventNameEn("");
    setEventNameRu("");
    setEventDescriptionKa("");
    setEventDescriptionEn("");
    setEventDescriptionRu("");
    resetEventImage(null);
  }

  useEffect(() => {
    if (!categoryId) return;

    let cancelled = false;
    listBulkDiscountCandidates("PRODUCT", Number(categoryId))
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

  const brandOptions = useMemo(
    () =>
      deriveOptionMap(candidates, (candidate) =>
        candidate.brand ? { id: candidate.brand.id, label: candidate.brand.name } : null,
      ),
    [candidates],
  );

  const sizeOptions = useMemo(
    () =>
      deriveOptionMap(candidates, (candidate) =>
        candidate.size ? { id: candidate.size.id, label: candidate.size.nameKa } : null,
      ),
    [candidates],
  );

  const colorOptions = useMemo(
    () =>
      deriveOptionMap(candidates, (candidate) =>
        candidate.color ? { id: candidate.color.id, label: candidate.color.nameKa } : null,
      ),
    [candidates],
  );

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

  async function handleApply() {
    const result = bulkDiscountFormSchema.safeParse({ discountPercent, startDate, endDate });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("აირჩიეთ მინიმუმ ერთი ვარიანტი");
      return;
    }
    // Opt-in only: with the toggle off, `event` stays undefined below and
    // this request/response is unchanged from before event-grouping existed
    // — every selected variant just gets its own independent discount, same
    // as always.
    if (createEvent && (!eventNameKa.trim() || !eventNameEn.trim() || !eventNameRu.trim())) {
      toast.error("ივენთის სახელი საჭიროა სამივე ენაზე");
      return;
    }
    setErrors({});
    setApplying(true);

    try {
      const result = await applyBulkDiscounts({
        targetType: "PRODUCT",
        itemIds: Array.from(selectedIds),
        discountPercent: Number(discountPercent),
        startDate,
        endDate,
        event: createEvent
          ? {
              nameKa: eventNameKa.trim(),
              nameEn: eventNameEn.trim(),
              nameRu: eventNameRu.trim(),
              descriptionKa: eventDescriptionKa.trim() || undefined,
              descriptionEn: eventDescriptionEn.trim() || undefined,
              descriptionRu: eventDescriptionRu.trim() || undefined,
            }
          : undefined,
      });
      toast.success(`ფასდაკლება დაემატა ${selectedIds.size} ვარიანტზე`);

      if (result.eventId && eventImageFile) {
        try {
          await uploadBulkDiscountEventImage(result.eventId, eventImageFile);
        } catch {
          toast.error("ივენთი შეიქმნა, მაგრამ სურათის ატვირთვა ვერ მოხერხდა");
        }
      }

      setDiscountPercent("");
      setStartDate("");
      setEndDate("");
      setSelectedIds(new Set());
      resetEventFields();
      if (categoryId) setCandidates(await listBulkDiscountCandidates("PRODUCT", Number(categoryId)));
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setApplying(false);
    }
  }

  function handleApplyClick() {
    applyWithHighPercentGate(discountPercent, handleApply);
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
              <button
                type="button"
                onClick={() => selectVisible(filteredCandidates.map((candidate) => candidate.variantId))}
                className="text-primary hover:underline"
              >
                ხილულის მონიშვნა
              </button>
              <button
                type="button"
                onClick={() => deselectVisible(filteredCandidates.map((candidate) => candidate.variantId))}
                className="text-muted-foreground hover:underline"
              >
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

          <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
            <div className="flex w-fit items-center gap-3 text-sm font-medium">
              <Toggle checked={createEvent} onChange={setCreateEvent} label="შექმენი ივენთად" />
              შექმენი ივენთად
            </div>
            <p className="text-xs text-muted-foreground">
              არასავალდებულოა — ჩართეთ, თუ გსურთ ამ ფასდაკლების ერთიან, დასახელებულ ივენთად შენახვა
              (მოგვიანებით გამეორებადი). გამორთულის შემთხვევაში ფასდაკლება დაემატება ზუსტად ისე, როგორც
              აქამდე — თითოეულ ვარიანტს ცალკე, ერთმანეთისგან დამოუკიდებლად.
            </p>

            {createEvent && (
              <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">სახელი (ქართულად) *</label>
                    <input
                      type="text"
                      value={eventNameKa}
                      onChange={(event) => setEventNameKa(event.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">სახელი (ინგლისურად) *</label>
                    <input
                      type="text"
                      value={eventNameEn}
                      onChange={(event) => setEventNameEn(event.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">სახელი (რუსულად) *</label>
                    <input
                      type="text"
                      value={eventNameRu}
                      onChange={(event) => setEventNameRu(event.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">აღწერა (ქართულად)</label>
                    <textarea
                      value={eventDescriptionKa}
                      onChange={(event) => setEventDescriptionKa(event.target.value)}
                      rows={2}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">აღწერა (ინგლისურად)</label>
                    <textarea
                      value={eventDescriptionEn}
                      onChange={(event) => setEventDescriptionEn(event.target.value)}
                      rows={2}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">აღწერა (რუსულად)</label>
                    <textarea
                      value={eventDescriptionRu}
                      onChange={(event) => setEventDescriptionRu(event.target.value)}
                      rows={2}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">სურათი</label>
                  <p className="text-xs text-muted-foreground">
                    რეკომენდებული ზომა: 1920×800px (თანაფარდობა ~21:9), მაქს. 5MB, ფორმატი: jpg/png/webp.
                  </p>
                  {eventImagePreviewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={eventImagePreviewUrl}
                      alt=""
                      className="h-32 w-full max-w-xs rounded-lg border border-border object-cover"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEventImageChange}
                    className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
                  />
                </div>
              </div>
            )}
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

function vehicleCandidateLabel(candidate: BulkVehicleDiscountCandidate): string {
  return `${candidate.brand.name} ${candidate.model.name}${candidate.variant ? ` — ${candidate.variant}` : ""} (${candidate.year})`;
}

function vehicleCandidateSpecSummary(candidate: BulkVehicleDiscountCandidate): string {
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

  // Opt-in grouping — off by default, and off means this batch is applied
  // exactly as it always was (no event field sent at all). See
  // handleApply's own comment.
  const [createEvent, setCreateEvent] = useState(false);
  const [eventNameKa, setEventNameKa] = useState("");
  const [eventNameEn, setEventNameEn] = useState("");
  const [eventNameRu, setEventNameRu] = useState("");
  const [eventDescriptionKa, setEventDescriptionKa] = useState("");
  const [eventDescriptionEn, setEventDescriptionEn] = useState("");
  const [eventDescriptionRu, setEventDescriptionRu] = useState("");
  const {
    file: eventImageFile,
    previewUrl: eventImagePreviewUrl,
    onChange: handleEventImageChange,
    reset: resetEventImage,
  } = useFileUploadPreview(null);

  function resetEventFields() {
    setCreateEvent(false);
    setEventNameKa("");
    setEventNameEn("");
    setEventNameRu("");
    setEventDescriptionKa("");
    setEventDescriptionEn("");
    setEventDescriptionRu("");
    resetEventImage(null);
  }

  useEffect(() => {
    if (!categoryId) return;

    let cancelled = false;
    listBulkDiscountCandidates("VEHICLE_LISTING", Number(categoryId))
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

  const brandOptions = useMemo(
    () => deriveOptionMap(candidates, (candidate) => ({ id: candidate.brand.id, label: candidate.brand.name })),
    [candidates],
  );

  const conditionOptions = useMemo(
    () =>
      deriveOptionMap(candidates, (candidate) => ({
        id: candidate.condition.id,
        label: candidate.condition.nameKa,
      })),
    [candidates],
  );

  const colorOptions = useMemo(
    () => deriveOptionMap(candidates, (candidate) => ({ id: candidate.color.id, label: candidate.color.nameKa })),
    [candidates],
  );

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
      if (query && !vehicleCandidateLabel(candidate).toLowerCase().includes(query)) return false;
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

  async function handleApply() {
    const result = bulkDiscountFormSchema.safeParse({ discountPercent, startDate, endDate });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("აირჩიეთ მინიმუმ ერთი განცხადება");
      return;
    }
    // Opt-in only: with the toggle off, `event` stays undefined below and
    // this request/response is unchanged from before event-grouping existed
    // — every selected listing just gets its own independent discount, same
    // as always.
    if (createEvent && (!eventNameKa.trim() || !eventNameEn.trim() || !eventNameRu.trim())) {
      toast.error("ივენთის სახელი საჭიროა სამივე ენაზე");
      return;
    }
    setErrors({});
    setApplying(true);

    try {
      const result = await applyBulkDiscounts({
        targetType: "VEHICLE_LISTING",
        itemIds: Array.from(selectedIds),
        discountPercent: Number(discountPercent),
        startDate,
        endDate,
        event: createEvent
          ? {
              nameKa: eventNameKa.trim(),
              nameEn: eventNameEn.trim(),
              nameRu: eventNameRu.trim(),
              descriptionKa: eventDescriptionKa.trim() || undefined,
              descriptionEn: eventDescriptionEn.trim() || undefined,
              descriptionRu: eventDescriptionRu.trim() || undefined,
            }
          : undefined,
      });
      toast.success(`ფასდაკლება დაემატა ${selectedIds.size} განცხადებაზე`);

      if (result.eventId && eventImageFile) {
        try {
          await uploadBulkDiscountEventImage(result.eventId, eventImageFile);
        } catch {
          toast.error("ივენთი შეიქმნა, მაგრამ სურათის ატვირთვა ვერ მოხერხდა");
        }
      }

      setDiscountPercent("");
      setStartDate("");
      setEndDate("");
      setSelectedIds(new Set());
      resetEventFields();
      if (categoryId) setCandidates(await listBulkDiscountCandidates("VEHICLE_LISTING", Number(categoryId)));
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setApplying(false);
    }
  }

  function handleApplyClick() {
    applyWithHighPercentGate(discountPercent, handleApply);
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
          ariaLabel="ტრანსპორტის კატეგორია"
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
            <Select
              multiple
              options={brandOptions}
              value={brandFilter}
              onChange={setBrandFilter}
              searchable
              placeholder="მარკა"
              ariaLabel="მარკის ფილტრი"
            />
            <Select
              multiple
              options={conditionOptions}
              value={conditionFilter}
              onChange={setConditionFilter}
              searchable
              placeholder="მდგომარეობა"
              ariaLabel="მდგომარეობის ფილტრი"
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
            {specFilterDefs.map((definition) => (
              <Select
                key={definition.field}
                multiple
                options={definition.options}
                value={specFilters[definition.field] ?? []}
                onChange={(value) => setSpecFilters((current) => ({ ...current, [definition.field]: value }))}
                searchable
                placeholder={definition.label}
                ariaLabel={definition.label}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              ნაჩვენებია {filteredCandidates.length} / {candidates.length} განცხადება — მონიშნულია{" "}
              <span className="font-semibold text-foreground">{selectedIds.size}</span>
            </span>
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                onClick={() =>
                  selectVisible(filteredCandidates.map((candidate) => candidate.vehicleListingId))
                }
                className="text-primary hover:underline"
              >
                ხილულის მონიშვნა
              </button>
              <button
                type="button"
                onClick={() =>
                  deselectVisible(filteredCandidates.map((candidate) => candidate.vehicleListingId))
                }
                className="text-muted-foreground hover:underline"
              >
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
                    <td className="px-3 py-2">{vehicleCandidateLabel(candidate)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{candidate.condition.nameKa}</td>
                    <td className="px-3 py-2 text-muted-foreground">{candidate.color.nameKa}</td>
                    <td className="px-3 py-2 text-muted-foreground">{vehicleCandidateSpecSummary(candidate) || "—"}</td>
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

          <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
            <div className="flex w-fit items-center gap-3 text-sm font-medium">
              <Toggle checked={createEvent} onChange={setCreateEvent} label="შექმენი ივენთად" />
              შექმენი ივენთად
            </div>
            <p className="text-xs text-muted-foreground">
              არასავალდებულოა — ჩართეთ, თუ გსურთ ამ ფასდაკლების ერთიან, დასახელებულ ივენთად შენახვა
              (მოგვიანებით გამეორებადი). გამორთულის შემთხვევაში ფასდაკლება დაემატება ზუსტად ისე, როგორც
              აქამდე — თითოეულ განცხადებას ცალკე, ერთმანეთისგან დამოუკიდებლად.
            </p>

            {createEvent && (
              <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">სახელი (ქართულად) *</label>
                    <input
                      type="text"
                      value={eventNameKa}
                      onChange={(event) => setEventNameKa(event.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">სახელი (ინგლისურად) *</label>
                    <input
                      type="text"
                      value={eventNameEn}
                      onChange={(event) => setEventNameEn(event.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">სახელი (რუსულად) *</label>
                    <input
                      type="text"
                      value={eventNameRu}
                      onChange={(event) => setEventNameRu(event.target.value)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">აღწერა (ქართულად)</label>
                    <textarea
                      value={eventDescriptionKa}
                      onChange={(event) => setEventDescriptionKa(event.target.value)}
                      rows={2}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">აღწერა (ინგლისურად)</label>
                    <textarea
                      value={eventDescriptionEn}
                      onChange={(event) => setEventDescriptionEn(event.target.value)}
                      rows={2}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">აღწერა (რუსულად)</label>
                    <textarea
                      value={eventDescriptionRu}
                      onChange={(event) => setEventDescriptionRu(event.target.value)}
                      rows={2}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">სურათი</label>
                  <p className="text-xs text-muted-foreground">
                    რეკომენდებული ზომა: 1920×800px (თანაფარდობა ~21:9), მაქს. 5MB, ფორმატი: jpg/png/webp.
                  </p>
                  {eventImagePreviewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={eventImagePreviewUrl}
                      alt=""
                      className="h-32 w-full max-w-xs rounded-lg border border-border object-cover"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEventImageChange}
                    className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
                  />
                </div>
              </div>
            )}
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
              გამოყენება ({selectedIds.size} განცხადებაზე)
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={highPercentConfirmOpen}
        onClose={() => setHighPercentConfirmOpen(false)}
        title="მაღალი ფასდაკლების დადასტურება"
        message={`დარწმუნებული ხართ, რომ გსურთ ${discountPercent}%-იანი ფასდაკლების გამოყენება ${selectedIds.size} განცხადებაზე?`}
        confirmLabel="გამოყენება"
        onConfirm={handleApply}
      />
    </div>
  );
}

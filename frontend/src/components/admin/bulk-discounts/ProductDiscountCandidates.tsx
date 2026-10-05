"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/shared/Select";
import type { BulkDiscountCandidate } from "@/lib/api/bulk-discounts";
import { formatPrice } from "@/lib/format";
import { deriveOptionMap } from "@/components/shared/useBulkDiscountSelection";
import {
  ActiveDiscountBadge,
  CandidateSelectionSummary,
  CandidateTable,
  type CandidateColumn,
} from "./BulkDiscountCandidateTable";
import type { CandidateListProps } from "./BulkDiscountPanelShell";

function candidateAttributeSummary(candidate: BulkDiscountCandidate): string {
  return candidate.attributeValues
    .filter((value) => value.option)
    .map((value) => `${value.attributeName.ka}: ${value.option?.label.ka}`)
    .join(", ");
}

const COLUMNS: CandidateColumn<BulkDiscountCandidate>[] = [
  {
    header: "პროდუქტი",
    cell: (candidate) => (
      <>
        {candidate.productName.ka}
        {candidate.sku && <span className="ml-1.5 text-xs text-muted-foreground">({candidate.sku})</span>}
      </>
    ),
  },
  { header: "ბრენდი", cell: (candidate) => candidate.brand?.name ?? "—", muted: true },
  { header: "მახასიათებლები", cell: (candidate) => candidateAttributeSummary(candidate) || "—", muted: true },
  { header: "ზომა", cell: (candidate) => candidate.size?.nameKa ?? "—", muted: true },
  { header: "ფერი", cell: (candidate) => candidate.color?.nameKa ?? "—", muted: true },
  { header: "ფასი", cell: (candidate) => formatPrice(candidate.price) },
  { header: "ფასდაკლება", cell: (candidate) => <ActiveDiscountBadge discount={candidate.activeDiscount} /> },
];

// Product-variant side of the bulk-discount panel: brand/size/color filters
// plus one multi-select per SELECT-type attribute present in the category.
export function ProductDiscountCandidates({
  candidates,
  selectedIds,
  toggleOne,
  selectVisible,
  deselectVisible,
  clearSelection,
}: CandidateListProps<BulkDiscountCandidate>) {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [sizeFilter, setSizeFilter] = useState<string[]>([]);
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<Record<number, string[]>>({});

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

  const visibleIds = () => filteredCandidates.map((candidate) => candidate.variantId);

  return (
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
            onChange={(value) => setAttributeFilters((current) => ({ ...current, [definition.attributeId]: value }))}
            searchable
            placeholder={definition.label}
            ariaLabel={definition.label}
          />
        ))}
      </div>

      <CandidateSelectionSummary
        shownCount={filteredCandidates.length}
        totalCount={candidates.length}
        noun="ვარიანტი"
        selectedCount={selectedIds.size}
        onSelectVisible={() => selectVisible(visibleIds())}
        onDeselectVisible={() => deselectVisible(visibleIds())}
        onClear={clearSelection}
      />

      <CandidateTable
        rows={filteredCandidates}
        getId={(candidate) => candidate.variantId}
        columns={COLUMNS}
        selectedIds={selectedIds}
        onToggle={toggleOne}
        emptyMessage="ვარიანტი ვერ მოიძებნა"
      />
    </>
  );
}

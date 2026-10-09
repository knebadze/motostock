"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/shared/Select";
import type { BulkVehicleDiscountCandidate } from "@/lib/api/bulk-discounts";
import { formatPrice } from "@/lib/format";
import { deriveOptionMap } from "@/components/shared/useBulkDiscountSelection";
import {
  ActiveDiscountBadge,
  CandidateSelectionSummary,
  CandidateTable,
  type CandidateColumn,
} from "./BulkDiscountCandidateTable";
import type { CandidateListProps } from "./BulkDiscountPanelShell";

function vehicleCandidateLabel(candidate: BulkVehicleDiscountCandidate): string {
  return `${candidate.brand.name} ${candidate.model.name}${candidate.variant ? ` — ${candidate.variant}` : ""} (${candidate.year})`;
}

function vehicleCandidateSpecSummary(candidate: BulkVehicleDiscountCandidate): string {
  return candidate.specValues.map((spec) => `${spec.fieldLabel.ka}: ${spec.value.nameKa}`).join(", ");
}

const COLUMNS: CandidateColumn<BulkVehicleDiscountCandidate>[] = [
  { header: "ტექნიკა", cell: vehicleCandidateLabel },
  { header: "მდგომარეობა", cell: (candidate) => candidate.condition.nameKa, muted: true },
  { header: "ფერი", cell: (candidate) => candidate.color.nameKa, muted: true },
  { header: "მახასიათებლები", cell: (candidate) => vehicleCandidateSpecSummary(candidate) || "—", muted: true },
  { header: "ფასი", cell: (candidate) => formatPrice(candidate.price, candidate.priceCurrency) },
  { header: "ფასდაკლება", cell: (candidate) => <ActiveDiscountBadge discount={candidate.activeDiscount} /> },
];

// Vehicle-listing side of the bulk-discount panel: brand/condition/color
// filters plus one multi-select per spec field present among the listings.
export function VehicleDiscountCandidates({
  candidates,
  selectedIds,
  toggleOne,
  selectVisible,
  deselectVisible,
  clearSelection,
}: CandidateListProps<BulkVehicleDiscountCandidate>) {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [conditionFilter, setConditionFilter] = useState<string[]>([]);
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [specFilters, setSpecFilters] = useState<Record<string, string[]>>({});

  const brandOptions = useMemo(
    () => deriveOptionMap(candidates, (candidate) => ({ id: candidate.brand.id, label: candidate.brand.name })),
    [candidates],
  );
  const conditionOptions = useMemo(
    () =>
      deriveOptionMap(candidates, (candidate) => ({ id: candidate.condition.id, label: candidate.condition.nameKa })),
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

  const visibleIds = () => filteredCandidates.map((candidate) => candidate.vehicleListingId);

  return (
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

      <CandidateSelectionSummary
        shownCount={filteredCandidates.length}
        totalCount={candidates.length}
        noun="განცხადება"
        selectedCount={selectedIds.size}
        onSelectVisible={() => selectVisible(visibleIds())}
        onDeselectVisible={() => deselectVisible(visibleIds())}
        onClear={clearSelection}
      />

      <CandidateTable
        rows={filteredCandidates}
        getId={(candidate) => candidate.vehicleListingId}
        columns={COLUMNS}
        selectedIds={selectedIds}
        onToggle={toggleOne}
        emptyMessage="განცხადება ვერ მოიძებნა"
      />
    </>
  );
}

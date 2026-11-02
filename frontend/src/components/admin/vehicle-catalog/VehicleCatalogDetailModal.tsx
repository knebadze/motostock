"use client";

import Image from "next/image";
import { Modal } from "@/components/shared/Modal";
import { Tabs } from "@/components/shared/Tabs";
import { SpecsList } from "@/components/shared/SpecsList";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { formatDateTime } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/api/client";
import type { VehicleCatalogEntry } from "@/lib/api/vehicle-catalog";
import { catalogYearsLabel, vehicleCatalogSpecRows } from "./vehicle-catalog-spec-rows";

function MainTab({ entry }: { entry: VehicleCatalogEntry }) {
  const imageUrl = resolveMediaUrl(entry.imageUrl);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
          {imageUrl ? (
            <Image src={imageUrl} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <div className="size-full rounded-xl border border-dashed border-border" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            {entry.brand.name} {entry.model.name}
            {entry.variant ? ` (${entry.variant})` : ""}
          </h3>
          <p className="text-sm text-muted-foreground">{entry.category.name.ka}</p>
        </div>
      </div>

      <SpecsList
        rows={[
          { label: "კატეგორია", value: entry.category.name.ka },
          { label: "მარკა", value: entry.brand.name },
          { label: "მოდელი", value: entry.model.name },
          { label: "ვარიანტი", value: entry.variant || "—" },
          { label: "წლები", value: catalogYearsLabel(entry) },
          { label: "დამატებულია", value: entry.submittedBy?.name ?? "ადმინის მიერ" },
          { label: "გარაჟებში", value: String(entry.popularity) },
          { label: "შექმნილია", value: formatDateTime(entry.createdAt) },
          { label: "განახლებულია", value: formatDateTime(entry.updatedAt) },
        ]}
        showAllLabel="ყველას ნახვა"
        collapseLabel="აკეცვა"
      />
    </div>
  );
}

function DescriptionTab({ entry }: { entry: VehicleCatalogEntry }) {
  const sections = [
    { label: "აღწერა (ka)", html: entry.descriptionKa },
    { label: "აღწერა (en)", html: entry.descriptionEn },
    { label: "აღწერა (ru)", html: entry.descriptionRu },
  ];

  if (sections.every((section) => !section.html)) {
    return <p className="text-sm text-muted-foreground">აღწერა არ არის მითითებული.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) =>
        section.html ? (
          <div key={section.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            <div
              className="mt-1.5 text-sm [&_a]:text-primary-text [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(section.html) }}
            />
          </div>
        ) : null,
      )}
    </div>
  );
}

// Read-only "view in full" for one catalog entry — the list row already
// carries every field, so no extra request.
export function VehicleCatalogDetailModal({
  entry,
  onClose,
}: {
  entry: VehicleCatalogEntry;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title="ტექნიკის დეტალები" size="2xl">
      <Tabs
        tabs={[
          { key: "main", label: "ძირითადი", content: <MainTab entry={entry} /> },
          {
            key: "specs",
            label: "სპეც-მონაცემები",
            content: (
              <SpecsList rows={vehicleCatalogSpecRows(entry)} showAllLabel="ყველას ნახვა" collapseLabel="აკეცვა" />
            ),
          },
          { key: "description", label: "აღწერა", content: <DescriptionTab entry={entry} /> },
        ]}
      />
    </Modal>
  );
}

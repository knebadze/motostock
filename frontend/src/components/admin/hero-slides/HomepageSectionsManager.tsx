"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Toggle } from "@/components/shared/Toggle";
import { updateHomepageSection, type HomepageSection } from "@/lib/api/homepage-sections";
import { ApiRequestError } from "@/lib/api/client";

const TYPE_LABELS: Record<HomepageSection["type"], string> = {
  DISCOUNTED_PRODUCTS: "ფასდაკლებული პროდუქტები",
  POPULAR_PRODUCTS: "პოპულარული პროდუქტები",
  DISCOUNTED_VEHICLES: "ფასდაკლებული ტრანსპორტი",
  POPULAR_VEHICLES: "პოპულარული ტრანსპორტი",
  DISCOUNTED_MIXED: "ფასდაკლებული პროდუქტები და ტრანსპორტი (შერეული)",
  POPULAR_MIXED: "პოპულარული პროდუქტები და ტრანსპორტი (შერეული)",
  CATEGORIES: "კატეგორიები",
};

const MIXED_TYPES: HomepageSection["type"][] = ["DISCOUNTED_MIXED", "POPULAR_MIXED"];

function SectionRow({
  section,
  isFirst,
  isLast,
  onMove,
  onToggleActive,
  onSaved,
}: {
  section: HomepageSection;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
  onToggleActive: (isActive: boolean) => void;
  onSaved: (section: HomepageSection) => void;
}) {
  const isMixed = MIXED_TYPES.includes(section.type);

  const [titleKa, setTitleKa] = useState(section.title.ka);
  const [titleEn, setTitleEn] = useState(section.title.en);
  const [titleRu, setTitleRu] = useState(section.title.ru);
  const [itemCount, setItemCount] = useState(String(section.itemCount));
  const [productItemCount, setProductItemCount] = useState(
    String(section.productItemCount ?? 5),
  );
  const [vehicleItemCount, setVehicleItemCount] = useState(
    String(section.vehicleItemCount ?? 5),
  );
  const [saving, setSaving] = useState(false);

  const dirty =
    titleKa !== section.title.ka ||
    titleEn !== section.title.en ||
    titleRu !== section.title.ru ||
    (isMixed
      ? productItemCount !== String(section.productItemCount ?? 5) ||
        vehicleItemCount !== String(section.vehicleItemCount ?? 5)
      : itemCount !== String(section.itemCount));

  function parseCount(value: string): number | null {
    const count = Number(value);
    return Number.isInteger(count) && count >= 1 && count <= 50 ? count : null;
  }

  async function handleSave() {
    if (!titleKa.trim() || !titleEn.trim() || !titleRu.trim()) {
      toast.error("სათაური სამივე ენაზეა საჭირო");
      return;
    }

    const title = { ka: titleKa.trim(), en: titleEn.trim(), ru: titleRu.trim() };

    setSaving(true);
    try {
      let updated: HomepageSection;
      if (isMixed) {
        const productCount = parseCount(productItemCount);
        const vehicleCount = parseCount(vehicleItemCount);
        if (productCount == null || vehicleCount == null) {
          toast.error("ერთეულების რაოდენობა 1-დან 50-მდე უნდა იყოს");
          return;
        }
        updated = await updateHomepageSection(section.id, {
          title,
          productItemCount: productCount,
          vehicleItemCount: vehicleCount,
        });
      } else {
        const count = parseCount(itemCount);
        if (count == null) {
          toast.error("ერთეულების რაოდენობა 1-დან 50-მდე უნდა იყოს");
          return;
        }
        updated = await updateHomepageSection(section.id, { title, itemCount: count });
      }
      onSaved(updated);
      toast.success("შენახულია");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => onMove("up")}
              disabled={isFirst}
              aria-label="ზემოთ აწევა"
              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-primary disabled:opacity-30"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onMove("down")}
              disabled={isLast}
              aria-label="ქვემოთ ჩამოწევა"
              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-primary disabled:opacity-30"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {TYPE_LABELS[section.type]}
          </span>
        </div>
        <Toggle checked={section.isActive} onChange={onToggleActive} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={titleKa}
          onChange={(event) => setTitleKa(event.target.value)}
          placeholder="სათაური (ქართულად)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          type="text"
          value={titleEn}
          onChange={(event) => setTitleEn(event.target.value)}
          placeholder="სათაური (ინგლისურად)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          type="text"
          value={titleRu}
          onChange={(event) => setTitleRu(event.target.value)}
          placeholder="სათაური (რუსულად)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="flex items-end gap-3">
        {isMixed ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">პროდუქტების რაოდენობა</label>
              <input
                type="number"
                min={1}
                max={50}
                value={productItemCount}
                onChange={(event) => setProductItemCount(event.target.value)}
                className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">ტრანსპორტის რაოდენობა</label>
              <input
                type="number"
                min={1}
                max={50}
                value={vehicleItemCount}
                onChange={(event) => setVehicleItemCount(event.target.value)}
                className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">ერთეულების რაოდენობა</label>
            <input
              type="number"
              min={1}
              max={50}
              value={itemCount}
              onChange={(event) => setItemCount(event.target.value)}
              className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "ინახება..." : "შენახვა"}
        </button>
      </div>
    </div>
  );
}

export function HomepageSectionsManager({
  initialSections,
}: {
  initialSections: HomepageSection[];
}) {
  const [sections, setSections] = useState(
    [...initialSections].sort((a, b) => a.sortOrder - b.sortOrder),
  );

  function updateOne(updated: HomepageSection) {
    setSections((current) =>
      current
        .map((section) => (section.id === updated.id ? updated : section))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    );
  }

  async function handleToggleActive(section: HomepageSection, isActive: boolean) {
    const previous = sections;
    setSections((current) => current.map((s) => (s.id === section.id ? { ...s, isActive } : s)));
    try {
      const updated = await updateHomepageSection(section.id, { isActive });
      updateOne(updated);
    } catch (error) {
      setSections(previous);
      const message = error instanceof ApiRequestError ? error.message : "განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleMove(section: HomepageSection, direction: "up" | "down") {
    const index = sections.findIndex((s) => s.id === section.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const target = sections[targetIndex];

    const previous = sections;
    const reordered = [...sections];
    reordered[index] = { ...target, sortOrder: section.sortOrder };
    reordered[targetIndex] = { ...section, sortOrder: target.sortOrder };
    setSections(reordered.sort((a, b) => a.sortOrder - b.sortOrder));

    try {
      await Promise.all([
        updateHomepageSection(section.id, { sortOrder: target.sortOrder }),
        updateHomepageSection(target.id, { sortOrder: section.sortOrder }),
      ]);
    } catch (error) {
      setSections(previous);
      const message =
        error instanceof ApiRequestError ? error.message : "დალაგების შენახვა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight">გვერდის სექციები</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        განსაზღვრეთ მთავარ გვერდზე გამოსაჩენი სექციების (პროდუქტის, ტრანსპორტის და შერეული
        სლაიდერები, კატეგორიები) თანმიმდევრობა, სათაური და რამდენი ერთეული ჩაერთოს თითოეულში.
        „ფასდაკლებული” ტიპები ავტომატურად აქტიური ფასდაკლების მქონე ერთეულებს იღებს, „პოპულარული” —
        ყველაზე ხშირად შეკვეთილს, „კატეგორიები” — ბაზაში არსებულ მშობელ კატეგორიებს, თანმიმდევრობის
        მიხედვით. „შერეული” სლაიდერები ერთ სლაიდერში აერთიანებს პროდუქტებსაც და ტრანსპორტსაც —
        თითოეულის რაოდენობა ცალ-ცალკე რეგულირდება.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {sections.map((section, index) => (
          <SectionRow
            key={section.id}
            section={section}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
            onMove={(direction) => handleMove(section, direction)}
            onToggleActive={(isActive) => handleToggleActive(section, isActive)}
            onSaved={updateOne}
          />
        ))}
      </div>
    </div>
  );
}

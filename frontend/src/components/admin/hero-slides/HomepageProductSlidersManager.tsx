"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Toggle } from "@/components/shared/Toggle";
import {
  updateHomepageProductSlider,
  type HomepageProductSlider,
} from "@/lib/api/homepage-product-sliders";
import { ApiRequestError } from "@/lib/api/client";

const TYPE_LABELS: Record<HomepageProductSlider["type"], string> = {
  DISCOUNTED: "ფასდაკლებული პროდუქტები",
  POPULAR: "პოპულარული პროდუქტები",
};

function SliderRow({
  slider,
  isFirst,
  isLast,
  onMove,
  onToggleActive,
  onSaved,
}: {
  slider: HomepageProductSlider;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
  onToggleActive: (isActive: boolean) => void;
  onSaved: (slider: HomepageProductSlider) => void;
}) {
  const [titleKa, setTitleKa] = useState(slider.title.ka);
  const [titleEn, setTitleEn] = useState(slider.title.en);
  const [titleRu, setTitleRu] = useState(slider.title.ru);
  const [itemCount, setItemCount] = useState(String(slider.itemCount));
  const [saving, setSaving] = useState(false);

  const dirty =
    titleKa !== slider.title.ka ||
    titleEn !== slider.title.en ||
    titleRu !== slider.title.ru ||
    itemCount !== String(slider.itemCount);

  async function handleSave() {
    const count = Number(itemCount);
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      toast.error("ერთეულების რაოდენობა 1-დან 50-მდე უნდა იყოს");
      return;
    }
    if (!titleKa.trim() || !titleEn.trim() || !titleRu.trim()) {
      toast.error("სათაური სამივე ენაზეა საჭირო");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateHomepageProductSlider(slider.id, {
        title: { ka: titleKa.trim(), en: titleEn.trim(), ru: titleRu.trim() },
        itemCount: count,
      });
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
            {TYPE_LABELS[slider.type]}
          </span>
        </div>
        <Toggle checked={slider.isActive} onChange={onToggleActive} />
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

export function HomepageProductSlidersManager({
  initialProductSliders,
}: {
  initialProductSliders: HomepageProductSlider[];
}) {
  const [sliders, setSliders] = useState(
    [...initialProductSliders].sort((a, b) => a.sortOrder - b.sortOrder),
  );

  function updateOne(updated: HomepageProductSlider) {
    setSliders((current) =>
      current.map((slider) => (slider.id === updated.id ? updated : slider)).sort((a, b) => a.sortOrder - b.sortOrder),
    );
  }

  async function handleToggleActive(slider: HomepageProductSlider, isActive: boolean) {
    const previous = sliders;
    setSliders((current) => current.map((s) => (s.id === slider.id ? { ...s, isActive } : s)));
    try {
      const updated = await updateHomepageProductSlider(slider.id, { isActive });
      updateOne(updated);
    } catch (error) {
      setSliders(previous);
      const message = error instanceof ApiRequestError ? error.message : "განახლება ვერ მოხერხდა";
      toast.error(message);
    }
  }

  async function handleMove(slider: HomepageProductSlider, direction: "up" | "down") {
    const index = sliders.findIndex((s) => s.id === slider.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sliders.length) return;
    const target = sliders[targetIndex];

    const previous = sliders;
    const reordered = [...sliders];
    reordered[index] = { ...target, sortOrder: slider.sortOrder };
    reordered[targetIndex] = { ...slider, sortOrder: target.sortOrder };
    setSliders(reordered.sort((a, b) => a.sortOrder - b.sortOrder));

    try {
      await Promise.all([
        updateHomepageProductSlider(slider.id, { sortOrder: target.sortOrder }),
        updateHomepageProductSlider(target.id, { sortOrder: slider.sortOrder }),
      ]);
    } catch (error) {
      setSliders(previous);
      const message =
        error instanceof ApiRequestError ? error.message : "დალაგების შენახვა ვერ მოხერხდა";
      toast.error(message);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight">პროდუქტის სლაიდერები</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        განსაზღვრეთ მთავარ გვერდზე გამოსაჩენი პროდუქტის სლაიდერების თანმიმდევრობა, სათაური და
        რამდენი პროდუქტი ჩაერთოს თითოეულში. „ფასდაკლებული” ავტომატურად აქტიური ფასდაკლების მქონე
        პროდუქტებს იღებს, „პოპულარული” — ყველაზე ხშირად შეკვეთილს.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {sliders.map((slider, index) => (
          <SliderRow
            key={slider.id}
            slider={slider}
            isFirst={index === 0}
            isLast={index === sliders.length - 1}
            onMove={(direction) => handleMove(slider, direction)}
            onToggleActive={(isActive) => handleToggleActive(slider, isActive)}
            onSaved={updateOne}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import { RichTextEditor } from "@/components/shared/RichTextEditor";

export function ProductDescriptionTab({
  descriptionKa,
  onDescriptionKaChange,
  descriptionEn,
  onDescriptionEnChange,
  descriptionRu,
  onDescriptionRuChange,
}: {
  descriptionKa: string;
  onDescriptionKaChange: (html: string) => void;
  descriptionEn: string;
  onDescriptionEnChange: (html: string) => void;
  descriptionRu: string;
  onDescriptionRuChange: (html: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">აღწერა (ქართულად)</label>
        <RichTextEditor value={descriptionKa} onChange={onDescriptionKaChange} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">აღწერა (ინგლისურად)</label>
        <RichTextEditor value={descriptionEn} onChange={onDescriptionEnChange} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">აღწერა (რუსულად)</label>
        <RichTextEditor value={descriptionRu} onChange={onDescriptionRuChange} />
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { addTagToProducts, removeTagFromProducts, type Tag } from "@/lib/api/tags";
import { ApiRequestError } from "@/lib/api/client";

// Bulk tag assign/remove for the products list's selected rows (ADMIN only —
// see ProductsManager). The selection survives paging/filtering, so a tag
// can be applied to products picked across several pages in one go.
export function ProductTagBulkBar({
  selectedIds,
  tags,
  onClearSelection,
  onDone,
}: {
  selectedIds: number[];
  tags: Tag[];
  onClearSelection: () => void;
  // Called after a successful change (the list reloads, selection clears).
  onDone: () => void;
}) {
  const [tagId, setTagId] = useState("");
  const [pending, setPending] = useState<"assign" | "unassign" | null>(null);

  if (selectedIds.length === 0) return null;

  async function run(action: "assign" | "unassign") {
    if (!tagId) {
      toast.error("აირჩიეთ ტეგი");
      return;
    }
    setPending(action);
    try {
      const run = action === "assign" ? addTagToProducts : removeTagFromProducts;
      const { changed, tag } = await run(Number(tagId), selectedIds);
      const skipped = selectedIds.length - changed;
      toast.success(
        action === "assign"
          ? `ტეგი „${tag.name}“ მიენიჭა ${changed} პროდუქტს${skipped > 0 ? ` (${skipped}-ს უკვე ჰქონდა)` : ""}`
          : `ტეგი „${tag.name}“ მოეხსნა ${changed} პროდუქტს${skipped > 0 ? ` (${skipped}-ს არ ჰქონდა)` : ""}`,
      );
      onDone();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "ოპერაცია ვერ შესრულდა");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="sticky top-2 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/40 bg-card p-3 shadow-sm">
      <span className="text-sm font-semibold">მონიშნულია: {selectedIds.length}</span>
      <div className="w-64">
        <Select
          options={tags.map((tag) => ({
            value: String(tag.id),
            label: tag.isActive ? tag.name : `${tag.name} (გამორთული)`,
          }))}
          value={tagId}
          onChange={setTagId}
          searchable
          placeholder={tags.length > 0 ? "აირჩიეთ ტეგი" : "ტეგები ჯერ არ არის შექმნილი"}
          ariaLabel="ტეგი მასობრივი ქმედებისთვის"
          emptyLabel="ტეგი ვერ მოიძებნა"
        />
      </div>
      <button
        type="button"
        onClick={() => void run("assign")}
        disabled={pending !== null || !tagId}
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {pending === "assign" ? "…" : "ტეგის მინიჭება"}
      </button>
      <button
        type="button"
        onClick={() => void run("unassign")}
        disabled={pending !== null || !tagId}
        className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-text disabled:opacity-50"
      >
        {pending === "unassign" ? "…" : "ტეგის მოხსნა"}
      </button>
      <button
        type="button"
        onClick={onClearSelection}
        className="ml-auto text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        მონიშვნის გაუქმება
      </button>
    </div>
  );
}

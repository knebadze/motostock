"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { createLookupItem, updateLookupItem, type LookupItem } from "@/lib/api/lookups";
import { ApiRequestError } from "@/lib/api/client";
import type { LookupTypeSlug } from "@/config/lookup-types";

export function LookupFormModal({
  open,
  onClose,
  onSaved,
  type,
  item,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  type: LookupTypeSlug;
  item: LookupItem | null;
}) {
  const isEditing = item !== null;
  const [key, setKey] = useState(item?.key ?? "");
  const [nameKa, setNameKa] = useState(item?.nameKa ?? "");
  const [nameEn, setNameEn] = useState(item?.nameEn ?? "");
  const [nameRu, setNameRu] = useState(item?.nameRu ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const input = {
        key: key.trim().toUpperCase(),
        nameKa: nameKa.trim(),
        nameEn: nameEn.trim(),
        nameRu: nameRu.trim(),
      };

      if (isEditing) {
        await updateLookupItem(type, item.id, input);
      } else {
        await createLookupItem(type, input);
      }

      toast.success(isEditing ? "ჩანაწერი განახლდა" : "ჩანაწერი დაემატა");
      onSaved();
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "ჩანაწერის რედაქტირება" : "ახალი ჩანაწერი"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lookup-key" className="text-sm font-medium">
            Key
          </label>
          <input
            id="lookup-key"
            required
            value={key}
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            placeholder="მაგ. PETROL"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lookup-name-ka" className="text-sm font-medium">
            სახელი (ქართულად)
          </label>
          <input
            id="lookup-name-ka"
            required
            value={nameKa}
            onChange={(event) => setNameKa(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lookup-name-en" className="text-sm font-medium">
            სახელი (ინგლისურად)
          </label>
          <input
            id="lookup-name-en"
            required
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lookup-name-ru" className="text-sm font-medium">
            სახელი (რუსულად)
          </label>
          <input
            id="lookup-name-ru"
            required
            value={nameRu}
            onChange={(event) => setNameRu(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? "ინახება..." : "შენახვა"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

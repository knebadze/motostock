"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FormActions } from "@/components/shared/FormActions";
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

        <LocalizedNameFields
          idPrefix="lookup-name"
          value={{ ka: nameKa, en: nameEn, ru: nameRu }}
          onChange={(next) => {
            setNameKa(next.ka);
            setNameEn(next.en);
            setNameRu(next.ru);
          }}
        />

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}

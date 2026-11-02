"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { createLookupItem, listLookupItems, updateLookupItem, type LookupItem } from "@/lib/api/lookups";
import { ApiRequestError } from "@/lib/api/client";
import type { LookupTypeSlug } from "@/config/lookup-types";
import { lookupFormSchema } from "@/lib/validation/lookups";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

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
  const [scaleId, setScaleId] = useState(item?.scaleId != null ? String(item.scaleId) : "");
  const [scales, setScales] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const isSize = type === "sizes";

  // Sizes belong to a size scale (clothing, EU shoe, volume, ...).
  useEffect(() => {
    if (!isSize) return;
    listLookupItems("size-scales")
      .then(setScales)
      .catch(() => toast.error("ზომის სკალების ჩატვირთვა ვერ მოხერხდა"));
  }, [isSize]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = lookupFormSchema.safeParse({
      key,
      name: { ka: nameKa, en: nameEn, ru: nameRu },
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setLoading(true);

    try {
      const input = {
        key: key.trim().toUpperCase(),
        nameKa: nameKa.trim(),
        nameEn: nameEn.trim(),
        nameRu: nameRu.trim(),
        ...(isSize ? { scaleId: scaleId ? Number(scaleId) : null } : {}),
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
            Key *
          </label>
          <input
            id="lookup-key"
            value={key}
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            placeholder="მაგ. PETROL"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
          <FieldError message={errors.key} />
        </div>

        <LocalizedNameFields
          idPrefix="lookup-name"
          value={{ ka: nameKa, en: nameEn, ru: nameRu }}
          onChange={(next) => {
            setNameKa(next.ka);
            setNameEn(next.en);
            setNameRu(next.ru);
          }}
          errors={{ ka: errors["name.ka"], en: errors["name.en"], ru: errors["name.ru"] }}
        />

        {isSize && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lookup-scale" className="text-sm font-medium">
              ზომის სკალა
            </label>
            <Select
              id="lookup-scale"
              options={[
                { value: "", label: "— ყველა კატეგორიაში —" },
                ...scales.map((scale) => ({ value: String(scale.id), label: scale.nameKa })),
              ]}
              value={scaleId}
              onChange={setScaleId}
            />
            <p className="text-xs text-muted-foreground">
              პროდუქტის ვარიანტში ეს ზომა მხოლოდ იმ კატეგორიებში გამოჩნდება, რომლებსაც ეს სკალა აქვს.
            </p>
          </div>
        )}

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}

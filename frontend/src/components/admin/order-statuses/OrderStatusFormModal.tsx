"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import {
  createOrderStatus,
  updateOrderStatusItem,
  type OrderStatusItem,
} from "@/lib/api/order-statuses";
import { ApiRequestError } from "@/lib/api/client";
import { lookupFormSchema } from "@/lib/validation/lookups";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function OrderStatusFormModal({
  open,
  onClose,
  onSaved,
  item,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: OrderStatusItem | null;
}) {
  const isEditing = item !== null;
  const [key, setKey] = useState(item?.key ?? "");
  const [nameKa, setNameKa] = useState(item?.nameKa ?? "");
  const [nameEn, setNameEn] = useState(item?.nameEn ?? "");
  const [nameRu, setNameRu] = useState(item?.nameRu ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

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
      };

      if (isEditing) {
        await updateOrderStatusItem(item.id, input);
      } else {
        await createOrderStatus(input);
      }

      toast.success(isEditing ? "სტატუსი განახლდა" : "სტატუსი დაემატა");
      onSaved();
      onClose();
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "სტატუსის რედაქტირება" : "ახალი სტატუსი"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-status-key" className="text-sm font-medium">
            Key *
          </label>
          <input
            id="order-status-key"
            value={key}
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            placeholder="მაგ. PENDING"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
          <FieldError message={errors.key} />
        </div>

        <LocalizedNameFields
          idPrefix="order-status-name"
          value={{ ka: nameKa, en: nameEn, ru: nameRu }}
          onChange={(next) => {
            setNameKa(next.ka);
            setNameEn(next.en);
            setNameRu(next.ru);
          }}
          errors={{ ka: errors["name.ka"], en: errors["name.en"], ru: errors["name.ru"] }}
        />

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
